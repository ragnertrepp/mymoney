const PIN_STORAGE_KEY = "rebuildme-mymoney-pin-v1";
const PIN_ITERATIONS = 310_000;
const BACKUP_ITERATIONS = 310_000;
const BACKUP_MAGIC = new TextEncoder().encode("MYMONEY1");

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type StoredPin = {
  version: 1;
  salt: string;
  verifier: string;
  iterations: number;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function randomBytes(length: number) {
  const value = new Uint8Array(length);
  crypto.getRandomValues(value);
  return value;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function derivePinBytes(pin: string, salt: Uint8Array, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(encoder.encode(pin)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: toArrayBuffer(salt), iterations },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

async function deriveAesKey(pin: string, salt: Uint8Array, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(encoder.encode(pin)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: toArrayBuffer(salt), iterations },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function hasPin() {
  try {
    return localStorage.getItem(PIN_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function isValidPinFormat(pin: string) {
  return /^\d{6,12}$/.test(pin);
}

export async function createPin(pin: string) {
  if (!isValidPinFormat(pin)) throw new Error("PIN peab olema 6–12 numbrit.");
  const salt = randomBytes(16);
  const verifier = await derivePinBytes(pin, salt, PIN_ITERATIONS);
  const stored: StoredPin = {
    version: 1,
    salt: bytesToBase64(salt),
    verifier: bytesToBase64(verifier),
    iterations: PIN_ITERATIONS,
  };
  localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(stored));
}

export async function verifyPin(pin: string) {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return false;
    const stored = JSON.parse(raw) as Partial<StoredPin>;
    if (stored.version !== 1 || typeof stored.salt !== "string" || typeof stored.verifier !== "string") return false;
    const iterations = typeof stored.iterations === "number" ? stored.iterations : PIN_ITERATIONS;
    const actual = await derivePinBytes(pin, base64ToBytes(stored.salt), iterations);
    return equalBytes(actual, base64ToBytes(stored.verifier));
  } catch {
    return false;
  }
}

export async function encryptBackupJson(value: unknown, pin: string) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveAesKey(pin, salt, BACKUP_ITERATIONS);
  const plaintext = encoder.encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext),
  );
  const ciphertext = new Uint8Array(encrypted);

  const headerLength = BACKUP_MAGIC.length + 1 + 4 + 1 + 1;
  const output = new Uint8Array(headerLength + salt.length + iv.length + ciphertext.length);
  let offset = 0;
  output.set(BACKUP_MAGIC, offset); offset += BACKUP_MAGIC.length;
  output[offset] = 1; offset += 1;
  new DataView(output.buffer).setUint32(offset, BACKUP_ITERATIONS, false); offset += 4;
  output[offset] = salt.length; offset += 1;
  output[offset] = iv.length; offset += 1;
  output.set(salt, offset); offset += salt.length;
  output.set(iv, offset); offset += iv.length;
  output.set(ciphertext, offset);

  return new Blob([toArrayBuffer(output)], { type: "application/octet-stream" });
}

export async function decryptBackupFile(file: File, pin: string) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const minimumHeader = BACKUP_MAGIC.length + 1 + 4 + 1 + 1;
  if (bytes.length <= minimumHeader) throw new Error("INVALID_BACKUP");

  for (let index = 0; index < BACKUP_MAGIC.length; index += 1) {
    if (bytes[index] !== BACKUP_MAGIC[index]) throw new Error("INVALID_BACKUP");
  }

  let offset = BACKUP_MAGIC.length;
  const version = bytes[offset]; offset += 1;
  if (version !== 1) throw new Error("UNSUPPORTED_BACKUP");
  const iterations = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false); offset += 4;
  const saltLength = bytes[offset]; offset += 1;
  const ivLength = bytes[offset]; offset += 1;
  if (saltLength < 8 || ivLength < 12 || bytes.length <= offset + saltLength + ivLength) throw new Error("INVALID_BACKUP");

  const salt = bytes.slice(offset, offset + saltLength); offset += saltLength;
  const iv = bytes.slice(offset, offset + ivLength); offset += ivLength;
  const ciphertext = bytes.slice(offset);
  const key = await deriveAesKey(pin, salt, iterations);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext),
    );
    return JSON.parse(decoder.decode(plaintext)) as unknown;
  } catch {
    throw new Error("WRONG_PIN_OR_CORRUPT_BACKUP");
  }
}

const VAULT_KEY = "rebuildme-mymoney-encrypted-vault-v1";
const VAULT_SALT_KEY = "rebuildme-mymoney-vault-salt-v1";
const PIN_KEY = "rebuildme-mymoney-pin-v1";
const ITERATIONS = 310_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type VaultPayload = { version: 1; iv: string; ciphertext: string };
type VaultData = Record<string, string>;

const nativeGet = Storage.prototype.getItem;
const nativeSet = Storage.prototype.setItem;
const nativeRemove = Storage.prototype.removeItem;
const nativeKey = Storage.prototype.key;

let cache: VaultData | null = null;
let key: CryptoKey | null = null;
let patched = false;
let writeChain = Promise.resolve();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function randomBytes(length: number) {
  const value = new Uint8Array(length);
  crypto.getRandomValues(value);
  return value;
}
function isSensitiveStorageKey(storageKey: string) {
  if (storageKey === PIN_KEY || storageKey === VAULT_KEY || storageKey === VAULT_SALT_KEY) return false;
  return storageKey.startsWith("rebuildme-mymoney-") || storageKey.startsWith("mymoney-");
}
async function deriveKey(pin: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
async function encryptVault(data: VaultData) {
  if (!key) throw new Error("VAULT_LOCKED");
  const iv = randomBytes(12);
  const plaintext = encoder.encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const payload: VaultPayload = { version: 1, iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(encrypted)) };
  nativeSet.call(localStorage, VAULT_KEY, JSON.stringify(payload));
}
async function decryptVault(raw: string): Promise<VaultData> {
  if (!key) throw new Error("VAULT_LOCKED");
  const payload = JSON.parse(raw) as VaultPayload;
  if (payload.version !== 1 || !payload.iv || !payload.ciphertext) throw new Error("INVALID_VAULT");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext),
  );
  const value = JSON.parse(decoder.decode(decrypted));
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function collectPlaintext(): VaultData {
  const data: VaultData = {};
  const length = localStorage.length;
  const keys: string[] = [];
  for (let i = 0; i < length; i += 1) {
    const storageKey = nativeKey.call(localStorage, i);
    if (storageKey && isSensitiveStorageKey(storageKey)) keys.push(storageKey);
  }
  for (const storageKey of keys) {
    const value = nativeGet.call(localStorage, storageKey);
    if (value !== null) data[storageKey] = value;
  }
  return data;
}
function removePlaintextKeys() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const storageKey = nativeKey.call(localStorage, i);
    if (storageKey && isSensitiveStorageKey(storageKey)) keys.push(storageKey);
  }
  for (const storageKey of keys) nativeRemove.call(localStorage, storageKey);
}
function queuePersist() {
  const snapshot = { ...(cache ?? {}) };
  writeChain = writeChain.then(() => encryptVault(snapshot)).catch(() => undefined);
}
function patchLocalStorage() {
  if (patched) return;
  patched = true;
  Storage.prototype.getItem = function(storageKey: string) {
    if (this === localStorage && isSensitiveStorageKey(storageKey) && cache) return cache[storageKey] ?? null;
    return nativeGet.call(this, storageKey);
  };
  Storage.prototype.setItem = function(storageKey: string, value: string) {
    if (this === localStorage && isSensitiveStorageKey(storageKey) && cache) {
      cache[storageKey] = String(value);
      queuePersist();
      return;
    }
    nativeSet.call(this, storageKey, value);
  };
  Storage.prototype.removeItem = function(storageKey: string) {
    if (this === localStorage && isSensitiveStorageKey(storageKey) && cache) {
      delete cache[storageKey];
      queuePersist();
      return;
    }
    nativeRemove.call(this, storageKey);
  };
}

export async function initializeSecureStorage(pin: string) {
  let saltRaw = nativeGet.call(localStorage, VAULT_SALT_KEY);
  if (!saltRaw) {
    saltRaw = bytesToBase64(randomBytes(16));
    nativeSet.call(localStorage, VAULT_SALT_KEY, saltRaw);
  }
  key = await deriveKey(pin, base64ToBytes(saltRaw));
  const encryptedRaw = nativeGet.call(localStorage, VAULT_KEY);
  const encryptedData = encryptedRaw ? await decryptVault(encryptedRaw) : {};
  const plaintextData = collectPlaintext();
  cache = { ...encryptedData, ...plaintextData };
  await encryptVault(cache);
  removePlaintextKeys();
  patchLocalStorage();
  window.addEventListener("pagehide", () => void flushSecureStorage());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushSecureStorage();
  });
}

export async function flushSecureStorage() {
  if (!cache || !key) return;
  const snapshot = { ...cache };
  writeChain = writeChain.then(() => encryptVault(snapshot));
  await writeChain;
}

const VAULT_KEY = "rebuildme-mymoney-encrypted-vault-v1";
const VAULT_SALT_KEY = "rebuildme-mymoney-vault-salt-v1";
const ITERATIONS = 310_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type VaultPayload = { version: 1; iv: string; ciphertext: string };
type VaultData = Record<string, string>;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function deriveKey(pin: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", toArrayBuffer(encoder.encode(pin)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: toArrayBuffer(salt), iterations: ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}
async function decryptVault(raw: string, pin: string, saltRaw: string): Promise<VaultData> {
  const payload = JSON.parse(raw) as VaultPayload;
  if (payload.version !== 1 || !payload.iv || !payload.ciphertext) throw new Error("INVALID_VAULT");
  const key = await deriveKey(pin, base64ToBytes(saltRaw));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(base64ToBytes(payload.iv)) },
    key,
    toArrayBuffer(base64ToBytes(payload.ciphertext)),
  );
  const value = JSON.parse(decoder.decode(decrypted));
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export async function restoreEncryptedVaultToLocalStorage(pin: string) {
  const raw = localStorage.getItem(VAULT_KEY);
  const salt = localStorage.getItem(VAULT_SALT_KEY);
  if (!raw || !salt) return;

  const data = await decryptVault(raw, pin, salt);
  for (const [storageKey, value] of Object.entries(data)) {
    localStorage.setItem(storageKey, value);
  }

  localStorage.removeItem(VAULT_KEY);
  localStorage.removeItem(VAULT_SALT_KEY);
}

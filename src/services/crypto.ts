export interface EncryptedPayload {
  iv: string;
  cipher: string;
}

export interface PinLockConfig {
  salt: string;
  pinHash: string;
  iterations: number;
}

const DEFAULT_ITERATIONS = 150_000;

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto SubtleCrypto is unavailable in this environment.');
  }
  return subtle;
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateSaltBase64(byteLength = 16): string {
  const buffer = new ArrayBuffer(byteLength);
  const bytes = new Uint8Array(buffer);
  globalThis.crypto.getRandomValues(bytes);
  return uint8ToBase64(bytes);
}

async function importPinMaterial(pin: string): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(pin);
  return getSubtle().importKey('raw', encoded, 'PBKDF2', false, [
    'deriveKey',
    'deriveBits',
  ]);
}

export async function deriveAesKeyFromPin(
  pin: string,
  saltBase64: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<CryptoKey> {
  const material = await importPinMaterial(pin);
  const saltBytes = base64ToUint8(saltBase64);
  return getSubtle().deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function hashPin(
  pin: string,
  saltBase64: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<string> {
  const material = await importPinMaterial(pin);
  const saltBytes = base64ToUint8(saltBase64);
  const bits = await getSubtle().deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256',
    },
    material,
    256,
  );
  return uint8ToBase64(new Uint8Array(bits));
}

export async function createPinConfig(pin: string): Promise<{
  config: PinLockConfig;
  key: CryptoKey;
}> {
  const salt = generateSaltBase64();
  const iterations = DEFAULT_ITERATIONS;
  const [pinHash, key] = await Promise.all([
    hashPin(pin, salt, iterations),
    deriveAesKeyFromPin(pin, salt, iterations),
  ]);
  return {
    config: { salt, pinHash, iterations },
    key,
  };
}

export async function verifyPinAndDeriveKey(
  pin: string,
  config: PinLockConfig,
): Promise<CryptoKey | null> {
  const candidateHash = await hashPin(pin, config.salt, config.iterations);
  if (candidateHash !== config.pinHash) {
    return null;
  }
  return deriveAesKeyFromPin(pin, config.salt, config.iterations);
}

export async function encryptJSON<T>(
  data: T,
  key: CryptoKey,
): Promise<EncryptedPayload> {
  const ivBuffer = new ArrayBuffer(12);
  const iv = new Uint8Array(ivBuffer);
  globalThis.crypto.getRandomValues(iv);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = await getSubtle().encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  );
  return {
    iv: uint8ToBase64(iv),
    cipher: uint8ToBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptJSON<T>(
  payload: EncryptedPayload,
  key: CryptoKey,
): Promise<T> {
  const iv = base64ToUint8(payload.iv);
  const cipher = base64ToUint8(payload.cipher);
  const decrypted = await getSubtle().decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipher,
  );
  const json = new TextDecoder().decode(decrypted);
  return JSON.parse(json) as T;
}

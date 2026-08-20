import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

/**
 * Encrypted backup envelope format (v1).
 * AES-256-CBC + HMAC-SHA256 (encrypt-then-MAC) with PBKDF2-SHA256 key derivation.
 */
export const BACKUP_CRYPTO_VERSION = 1;
export const BACKUP_KDF = 'PBKDF2-SHA256';
export const PBKDF2_DEFAULT_ROUNDS = 100000;
export const MIN_PASSPHRASE_LENGTH = 8;

export interface EncryptedBackupPayload {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  rounds: number;
  salt: string; // base64
  iv: string;   // base64 (16 bytes)
  ct: string;   // base64 ciphertext
  mac: string;  // base64 HMAC-SHA256(macKey, iv || ct)
}

function bytesToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  let hex = '';
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, '0');
  }
  return CryptoJS.enc.Hex.parse(hex);
}

/**
 * Derives a single 64-byte key: first 32 bytes = AES cipher key, last 32 bytes = HMAC key.
 */
function deriveKeys(
  passphrase: string,
  salt: CryptoJS.lib.WordArray,
  rounds: number
): { cipherKey: CryptoJS.lib.WordArray; macKey: CryptoJS.lib.WordArray } {
  const material = CryptoJS.PBKDF2(passphrase, salt, {
    keySize: 512 / 32,
    iterations: rounds,
    hasher: CryptoJS.algo.SHA256,
  });
  return {
    cipherKey: CryptoJS.lib.WordArray.create(material.words.slice(0, 8), 32),
    macKey: CryptoJS.lib.WordArray.create(material.words.slice(8, 16), 32),
  };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function isEncryptedBackupPayload(value: unknown): value is EncryptedBackupPayload {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return (
    e.v === BACKUP_CRYPTO_VERSION &&
    e.kdf === BACKUP_KDF &&
    typeof e.rounds === 'number' &&
    e.rounds > 0 &&
    typeof e.salt === 'string' &&
    e.salt.length > 0 &&
    typeof e.iv === 'string' &&
    e.iv.length > 0 &&
    typeof e.ct === 'string' &&
    e.ct.length > 0 &&
    typeof e.mac === 'string' &&
    e.mac.length > 0
  );
}

export interface EncryptOptions {
  rounds?: number;
}

/**
 * Encrypts arbitrary JSON-serializable data into an encrypted envelope.
 * The salt and IV are generated with expo-crypto (secure randomness).
 */
export async function encryptBackupJson(
  data: unknown,
  passphrase: string,
  options: EncryptOptions = {}
): Promise<EncryptedBackupPayload> {
  const rounds = options.rounds ?? PBKDF2_DEFAULT_ROUNDS;
  if (!passphrase || passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`);
  }

  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const salt = bytesToWordArray(saltBytes);
  const iv = bytesToWordArray(ivBytes);

  const { cipherKey, macKey } = deriveKeys(passphrase, salt, rounds);
  const plaintext = JSON.stringify(data);
  const ct = CryptoJS.AES.encrypt(plaintext, cipherKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).ciphertext;

  const macInput = iv.clone().concat(ct);
  const mac = CryptoJS.HmacSHA256(macInput, macKey).toString(CryptoJS.enc.Base64);

  return {
    v: BACKUP_CRYPTO_VERSION,
    kdf: BACKUP_KDF,
    rounds,
    salt: salt.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Base64),
    ct: ct.toString(CryptoJS.enc.Base64),
    mac,
  };
}

/**
 * Decrypts an encrypted envelope. Throws an Error with a user-friendly message
 * when the passphrase is wrong or the payload is corrupted.
 */
export function decryptBackupPayload(payload: EncryptedBackupPayload, passphrase: string): unknown {
  if (!isEncryptedBackupPayload(payload)) {
    throw new Error('Unsupported or corrupted backup format');
  }
  if (!payload.rounds || payload.rounds <= 0 || payload.rounds > 2000000) {
    throw new Error('Unsupported backup key derivation settings');
  }

  const salt = CryptoJS.enc.Base64.parse(payload.salt);
  const iv = CryptoJS.enc.Base64.parse(payload.iv);
  const ct = CryptoJS.enc.Base64.parse(payload.ct);

  const { cipherKey, macKey } = deriveKeys(passphrase, salt, payload.rounds);
  const expectedMac = CryptoJS.HmacSHA256(iv.clone().concat(ct), macKey).toString(CryptoJS.enc.Base64);
  if (!constantTimeEqual(expectedMac, payload.mac)) {
    throw new Error('Incorrect passphrase or corrupted backup. Your data was not modified.');
  }

  const decrypted = CryptoJS.AES.decrypt({ ciphertext: ct } as CryptoJS.lib.CipherParams, cipherKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error('Failed to decrypt backup. Your data was not modified.');
  }

  try {
    return JSON.parse(decrypted);
  } catch {
    throw new Error('Decrypted backup data is corrupted. Your data was not modified.');
  }
}

/**
 * Decrypts an encrypted envelope from raw JSON text (as stored on disk).
 */
export function decryptBackupJson(jsonText: string, passphrase: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Downloaded file is not a valid pocketFlow backup');
  }
  if (!isEncryptedBackupPayload(parsed)) {
    throw new Error('Downloaded file is not an encrypted pocketFlow backup');
  }
  return decryptBackupPayload(parsed, passphrase);
}

/**
 * Serializes an encrypted envelope to compact JSON text (for disk / upload).
 */
export function encryptedPayloadToJson(payload: EncryptedBackupPayload): string {
  return JSON.stringify(payload);
}
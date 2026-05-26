import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getMasterKey(): Buffer {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY environment variable is not set. " +
        "Generate one with: openssl rand -hex 32",
    );
  }

  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY must be exactly 64 hex characters (32 bytes). " +
        "Generate one with: openssl rand -hex 32",
    );
  }

  return keyBuffer;
}

export interface EncryptedKey {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt a plaintext API key using AES-256-GCM.
 * Returns base64-encoded encrypted text, IV, and auth tag.
 */
export function encryptApiKey(plaintext: string): EncryptedKey {
  const masterKey = getMasterKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/**
 * Decrypt an API key previously encrypted with encryptApiKey.
 */
export function decryptApiKey(
  encrypted: string,
  iv: string,
  authTag: string,
): string {
  const masterKey = getMasterKey();

  const decipher = createDecipheriv(
    ALGORITHM,
    masterKey,
    Buffer.from(iv, "base64"),
    { authTagLength: AUTH_TAG_LENGTH },
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

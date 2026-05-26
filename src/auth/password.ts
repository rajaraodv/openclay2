import { randomBytes, pbkdf2, timingSafeEqual } from "node:crypto";

const ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

function deriveKey(
  password: string,
  salt: Buffer
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

/**
 * Hash a plaintext password with a random salt.
 * Returns a string in the format `salt:hash` (both hex-encoded).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32);
  const key = await deriveKey(password, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

/**
 * Verify a plaintext password against a stored `salt:hash` string.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(hashHex, "hex");
  const derivedKey = await deriveKey(password, salt);

  if (storedKey.length !== derivedKey.length) return false;

  return timingSafeEqual(storedKey, derivedKey);
}

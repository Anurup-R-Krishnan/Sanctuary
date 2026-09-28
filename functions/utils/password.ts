/**
 * WebCrypto PBKDF2-SHA256 password hashing with per-user salt.
 * Format: pbkdf2$<iterations>$<saltB64url>$<hashB64url>
 *
 * Iterations are 100000 because Cloudflare Workers' WebCrypto rejects PBKDF2
 * iteration counts above 100000. The count is stored per hash, so it can be
 * raised later without invalidating existing passwords.
 */

const ITERATIONS = 100_000;
const MAX_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { hash: "SHA-256", iterations, name: "PBKDF2", salt },
    baseKey,
    KEY_BYTES * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${base64urlEncode(salt)}$${base64urlEncode(hash)}`;
}

/** Verify a password against a stored hash. Constant-time comparison. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_ITERATIONS) return false;

  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = base64urlDecode(parts[2]);
    expected = base64urlDecode(parts[3]);
  } catch {
    return false;
  }
  if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;

  return constantTimeCompare(await derive(password, salt, iterations), expected);
}

/**
 * Constant-time byte array comparison.
 */
function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Base64url encode (RFC 4648 without padding).
 */
function base64urlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Base64url decode (RFC 4648 without padding).
 */
function base64urlDecode(str: string): Uint8Array {
  // Add padding if needed
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) {
    padded += "=";
  }

  const binaryString = atob(padded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a session token (32 random bytes, base64url encoded).
 */
export function generateSessionToken(): string {
  const token = crypto.getRandomValues(new Uint8Array(32));
  return base64urlEncode(token);
}

/**
 * Hash a session token (store only the hash in DB).
 */
export async function hashSessionToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const tokenBuffer = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", tokenBuffer);
  return base64urlEncode(new Uint8Array(hashBuffer));
}

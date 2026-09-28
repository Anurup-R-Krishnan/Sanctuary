import { z } from "zod";

import { generateSessionToken, hashSessionToken } from "./password";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const email = z.string().trim().toLowerCase().max(254).email("Enter a valid email address");

export const signupSchema = z.object({
  email,
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(200, "Password must be at most 200 characters"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(200, "Invalid email or password"),
});

export const nowSeconds = () => Math.floor(Date.now() / 1000);

export function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}

/**
 * Counts one attempt against `key` and reports whether it is over `max` within
 * `windowSeconds`. A single atomic upsert, so parallel requests can't slip past
 * the check, and the window restarts once it has elapsed.
 */
export async function isRateLimited(
  db: D1Database,
  key: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  const now = nowSeconds();
  const row = await db
    .prepare(
      `INSERT INTO auth_attempts (key, count, window_start) VALUES (?1, 1, ?2)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN window_start <= ?3 THEN 1 ELSE count + 1 END,
         window_start = CASE WHEN window_start <= ?3 THEN ?2 ELSE window_start END
       RETURNING count`
    )
    .bind(key, now, now - windowSeconds)
    .first<{ count: number }>();
  return (row?.count ?? 0) > max;
}

/** Reports whether `key` is already over `max` in its current window, without counting an attempt. */
export async function isLockedOut(db: D1Database, key: string, max: number, windowSeconds: number): Promise<boolean> {
  const row = await db
    .prepare("SELECT count FROM auth_attempts WHERE key = ? AND window_start > ?")
    .bind(key, nowSeconds() - windowSeconds)
    .first<{ count: number }>();
  return (row?.count ?? 0) >= max;
}

export async function clearRateLimit(db: D1Database, key: string): Promise<void> {
  await db.prepare("DELETE FROM auth_attempts WHERE key = ?").bind(key).run();
}

/** Creates a session and returns the raw token; only its hash is stored. */
export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = generateSessionToken();
  const now = nowSeconds();
  await db.batch([
    db.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").bind(now),
    db.prepare("DELETE FROM auth_attempts WHERE window_start <= ?").bind(now - 24 * 60 * 60),
    db
      .prepare("INSERT INTO auth_sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), userId, await hashSessionToken(token), now, now + SESSION_TTL_SECONDS),
  ]);
  return token;
}

/** Parses a JSON body, rejecting anything not sent as application/json. */
export async function readJson(request: Request): Promise<unknown> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    throw new z.ZodError([{ code: "custom", message: "Expected application/json", path: [], input: undefined }]);
  }
  return request.json();
}

export function validationMessage(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid request";
}

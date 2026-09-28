import type { Env } from "../types";

import { hashSessionToken } from "./password";

// DISABLE_AUTH maps every request to one shared account, so it is honoured only
// when the request targets a loopback or private-network host (local dev,
// containers, a phone on the LAN) — never a deployed hostname.
const LOCAL_HOST = /^(localhost|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[::1\]|[\w-]+\.local)$/;

export function isAuthDisabled(request: Request, env: Env): boolean {
  return env.DISABLE_AUTH === "true" && LOCAL_HOST.test(new URL(request.url).hostname);
}

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * Resolves the caller's user id from an `Authorization: Bearer <session token>`
 * header. Auth is header-only (no cookies), so cross-site requests cannot ride
 * on ambient credentials and no CSRF check is needed.
 */
export async function getUserId(request: Request, env: Env): Promise<string | null> {
  if (isAuthDisabled(request, env)) return "guest-user";

  const token = readBearerToken(request);
  if (!token) return null;

  const row = await env.SANCTUARY_DB.prepare(
    "SELECT user_id FROM auth_sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1"
  )
    .bind(await hashSessionToken(token), Math.floor(Date.now() / 1000))
    .first<{ user_id: string }>();

  return row?.user_id ?? null;
}

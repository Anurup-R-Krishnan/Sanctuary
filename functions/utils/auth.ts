import type { Env } from "../types";
import { verifyToken } from "@clerk/backend";

export type ActorMode = "guest" | "clerk";
export type Actor = { mode: ActorMode; userId: string };

function getBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function normalizeGuestId(raw: string | null): string {
  if (!raw) return "guest_anon";
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return "guest_anon";
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return "guest_anon";
  return trimmed;
}

export function getModeFromUserId(userId: string): ActorMode {
  return userId.startsWith("clerk:") ? "clerk" : "guest";
}

export async function resolveActor(request: Request, env: Env): Promise<Actor | null> {
  const guestHeaderId = normalizeGuestId(request.headers.get("X-Guest-Id"));
  const token = getBearerToken(request);
  if (!token) {
    return { mode: "guest", userId: `guest:${guestHeaderId}` };
  }

  const secretKey = env.CLERK_SECRET_KEY;
  if (!secretKey) return null;

  try {
    const payload = await verifyToken(token, { secretKey });
    const subject = typeof payload.sub === "string" ? payload.sub.trim() : "";
    // Clerk user ids are expected to be user_*; fail closed on malformed subjects.
    if (!subject || !subject.startsWith("user_")) return null;
    return { mode: "clerk", userId: `clerk:${subject}` };
  } catch {
    return null;
  }
}

export async function getUserId(request: Request, env: Env): Promise<string | null> {
  const actor = await resolveActor(request, env);
  return actor?.userId ?? null;
}

import { verifyToken } from "@clerk/backend";

import type { Env } from "../types";

export async function getUserId(request: Request, env: Env): Promise<string | null> {
  if (env.DISABLE_CLERK_AUTH === "true") return "guest-user";

  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;

  const token = auth.slice(7).trim();
  if (!token) return null;

  if (!env.CLERK_SECRET_KEY) {
    console.error("[auth] CLERK_SECRET_KEY not set");
    return null;
  }

  try {
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
    return payload.sub ?? null;
  } catch (err) {
    console.warn("[auth] Token rejected:", (err as Error)?.message);
    return null;
  }
}

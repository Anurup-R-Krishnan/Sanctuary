import type { Env } from "../types";

export async function getUserId(request: Request, env: Env): Promise<string | null> {
  const authDisabled = env.DISABLE_CLERK_AUTH === "true";
  if (authDisabled) return "guest-user";

  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;

  // Minimal token handling for v2 scaffold. Replace with Clerk verification middleware.
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  return `clerk:${token.slice(0, 16)}`;
}

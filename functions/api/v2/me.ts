import { getUserId } from "../../utils/auth";
import type { Env } from "../../types";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const mode = userId.startsWith("guest") ? "guest" : "clerk";
  return new Response(JSON.stringify({ userId, mode }), {
    headers: { "Content-Type": "application/json" }
  });
};

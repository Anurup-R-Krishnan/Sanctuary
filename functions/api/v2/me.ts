import { resolveActor } from "../../utils/auth";
import type { Env } from "../../types";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const actor = await resolveActor(request, env);
  if (!actor) return new Response("Unauthorized", { status: 401 });
  return new Response(JSON.stringify(actor), {
    headers: { "Content-Type": "application/json" }
  });
};

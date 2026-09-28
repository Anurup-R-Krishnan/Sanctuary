import { errorJson, handleOptions, json, type PagesContext, requireUser } from "../_shared";
import { getSchemaReady } from "../../utils/schemaCache";

export const onRequestOptions = () => handleOptions();

export async function onRequestGet({ env, request }: PagesContext): Promise<Response> {
  try {
    const userId = await requireUser(request, env);
    if (userId instanceof Response) return userId;
    if (userId === "guest-user") return json({ email: null, id: userId });

    await getSchemaReady(env.SANCTUARY_DB);
    const user = await env.SANCTUARY_DB.prepare("SELECT id, email FROM users WHERE id = ?")
      .bind(userId)
      .first<{ email: string; id: string }>();
    // A valid session for a deleted user is treated as signed out.
    if (!user) return errorJson("Unauthorized", 401);
    return json(user);
  } catch (err) {
    console.error("[auth/me]", err);
    return errorJson("Internal server error", 500);
  }
}

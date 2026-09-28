import { errorJson, handleOptions, json, type PagesContext } from "../_shared";
import { readBearerToken } from "../../utils/auth";
import { hashSessionToken } from "../../utils/password";
import { getSchemaReady } from "../../utils/schemaCache";

export const onRequestOptions = () => handleOptions();

export async function onRequestPost({ env, request }: PagesContext): Promise<Response> {
  try {
    await getSchemaReady(env.SANCTUARY_DB);
    const token = readBearerToken(request);
    if (token) {
      await env.SANCTUARY_DB.prepare("DELETE FROM auth_sessions WHERE token_hash = ?")
        .bind(await hashSessionToken(token))
        .run();
    }
    return json({ ok: true });
  } catch (err) {
    console.error("[auth/logout]", err);
    return errorJson("Internal server error", 500);
  }
}

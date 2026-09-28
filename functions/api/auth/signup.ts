import { z } from "zod";

import { errorJson, handleOptions, json, type PagesContext } from "../_shared";
import { clientIp, createSession, isRateLimited, nowSeconds, readJson, signupSchema, validationMessage } from "../../utils/authFlow";
import { hashPassword } from "../../utils/password";
import { getSchemaReady } from "../../utils/schemaCache";

export const onRequestOptions = () => handleOptions();

export async function onRequestPost({ env, request }: PagesContext): Promise<Response> {
  try {
    await getSchemaReady(env.SANCTUARY_DB);
    const { email, password } = signupSchema.parse(await readJson(request));

    // Tight per-IP limit: signup reveals whether an email is registered (409),
    // so keep enumeration slow.
    if (await isRateLimited(env.SANCTUARY_DB, `signup:ip:${clientIp(request)}`, 5, 60 * 60)) {
      return errorJson("Too many attempts. Try again later.", 429);
    }

    const userId = crypto.randomUUID();
    try {
      await env.SANCTUARY_DB.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
        .bind(userId, email, await hashPassword(password), nowSeconds())
        .run();
    } catch (err) {
      if (String((err as Error)?.message).includes("UNIQUE")) {
        return errorJson("An account with this email already exists", 409);
      }
      throw err;
    }

    const token = await createSession(env.SANCTUARY_DB, userId);
    return json({ token, user: { email, id: userId } }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return errorJson(validationMessage(err), 400);
    if (err instanceof SyntaxError) return errorJson("Invalid JSON body", 400);
    console.error("[auth/signup]", err);
    return errorJson("Internal server error", 500);
  }
}

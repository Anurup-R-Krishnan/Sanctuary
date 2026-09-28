import { z } from "zod";

import { errorJson, handleOptions, json, type PagesContext } from "../_shared";
import {
  clearRateLimit,
  clientIp,
  createSession,
  isLockedOut,
  isRateLimited,
  loginSchema,
  readJson,
  validationMessage,
} from "../../utils/authFlow";
import { verifyPassword } from "../../utils/password";
import { getSchemaReady } from "../../utils/schemaCache";

// Well-formed placeholder hash: verifying against it costs the same as a real
// check, so unknown emails are not distinguishable by response time.
const DUMMY_PASSWORD_HASH = "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const WINDOW_SECONDS = 15 * 60;
// Failed passwords are limited per email+IP (tight) and per email overall
// (catches distributed guessing). Only failures count, and the per-email cap
// is enforced only against IPs that have themselves failed on this email — so
// flooding an account from other addresses never locks out its owner.
const PAIR_FAILURES = 10;
const EMAIL_FAILURES = 200;
const EMAIL_WINDOW_SECONDS = 60 * 60;

export const onRequestOptions = () => handleOptions();

export async function onRequestPost({ env, request }: PagesContext): Promise<Response> {
  try {
    await getSchemaReady(env.SANCTUARY_DB);
    const { email, password } = loginSchema.parse(await readJson(request));
    const db = env.SANCTUARY_DB;
    const ip = clientIp(request);
    const pairKey = `login:pair:${email}:${ip}`;
    const emailKey = `login:email:${email}`;

    if (await isRateLimited(db, `login:ip:${ip}`, 30, WINDOW_SECONDS)) {
      return errorJson("Too many attempts. Try again later.", 429);
    }
    // Count the attempt against this email+IP before verifying (atomic upsert),
    // so parallel requests can't all slip past the check. Success clears it.
    const pairLocked = await isRateLimited(db, pairKey, PAIR_FAILURES, WINDOW_SECONDS);
    // The per-email cap only binds IPs that already have an attempt on this
    // email in the window (pair count >= 2 including this one), so a flood
    // from elsewhere never locks the owner out on their first try.
    const emailLocked =
      (await isLockedOut(db, pairKey, 2, WINDOW_SECONDS)) &&
      (await isLockedOut(db, emailKey, EMAIL_FAILURES, EMAIL_WINDOW_SECONDS));
    if (pairLocked || emailLocked) {
      return errorJson("Too many attempts. Try again later.", 429);
    }

    const user = await db.prepare("SELECT id, password_hash FROM users WHERE email = ?")
      .bind(email)
      .first<{ id: string; password_hash: string }>();

    const valid = await verifyPassword(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
    if (!user || !valid) {
      await isRateLimited(db, emailKey, EMAIL_FAILURES, EMAIL_WINDOW_SECONDS);
      return errorJson("Invalid email or password", 401);
    }

    await clearRateLimit(db, pairKey);
    const token = await createSession(db, user.id);
    return json({ token, user: { email, id: user.id } });
  } catch (err) {
    if (err instanceof z.ZodError) return errorJson(validationMessage(err), 400);
    if (err instanceof SyntaxError) return errorJson("Invalid JSON body", 400);
    console.error("[auth/login]", err);
    return errorJson("Internal server error", 500);
  }
}

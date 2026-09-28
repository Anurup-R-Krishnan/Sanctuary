import { z } from "zod";

import { getSchemaReady } from "../utils/schemaCache";
import { errorJson, handleOptions, json, purgeEdgeCache, requireUser, withEdgeCache, type PagesContext } from "./_shared";

export const onRequestOptions = () => handleOptions();

const MAX_KEYS = 150;
const MAX_JSON_BYTES = 32_000;

const settingValue = z.union([
  z.string().max(4000),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(z.string().max(200)).max(100),
  z.record(z.string().max(64), z.array(z.string().max(64)).max(10)),
  z.array(z.record(z.string().max(64), z.union([z.string().max(200), z.number().finite(), z.boolean()]))).max(50),
]);

export const settingsSchema = z
  .record(z.string().min(1).max(64), settingValue)
  .refine((value) => Object.keys(value).length <= MAX_KEYS, { message: "Too many settings" })
  .refine((value) => (value.dailyGoal === undefined || (typeof value.dailyGoal === "number" && value.dailyGoal >= 1 && value.dailyGoal <= 1440)), { message: "Invalid daily goal" })
  .refine((value) => (value.weeklyGoal === undefined || (typeof value.weeklyGoal === "number" && value.weeklyGoal >= 1 && value.weeklyGoal <= 10080)), { message: "Invalid weekly goal" });

export type StoredSettings = z.infer<typeof settingsSchema>;

export function parseStoredSettings(raw: unknown): StoredSettings {
  if (typeof raw !== "string") return {};
  try {
    const parsed = settingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function fromDb(row: Record<string, unknown>): StoredSettings {
  const stored = parseStoredSettings(row.settings_json);
  return {
    dailyGoal: Number(row.daily_goal) || 30,
    weeklyGoal: Number(row.weekly_goal) || 150,
    ...stored,
  };
}

export async function onRequestGet({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const fetcher = async () => {
    await getSchemaReady(env.SANCTUARY_DB);
    const row = await env.SANCTUARY_DB.prepare(
      "SELECT daily_goal, weekly_goal, settings_json FROM user_settings WHERE user_id = ?"
    ).bind(user).first<Record<string, unknown>>();
    return json(row ? fromDb(row) : {});
  };

  return withEdgeCache(request, `settings-${user}`, fetcher);
}

export async function onRequestPut({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJson("Invalid JSON body", 400);
  }

  const parseResult = settingsSchema.safeParse(body);
  if (!parseResult.success) return errorJson("Invalid settings payload", 400);

  const settings = parseResult.data;
  const serialized = JSON.stringify(settings);
  if (serialized.length > MAX_JSON_BYTES) return errorJson("Settings payload too large", 413);

  const dailyGoal = typeof settings.dailyGoal === "number" ? Math.round(settings.dailyGoal) : 30;
  const weeklyGoal = typeof settings.weeklyGoal === "number" ? Math.round(settings.weeklyGoal) : 150;

  await getSchemaReady(env.SANCTUARY_DB);
  await env.SANCTUARY_DB.prepare(
    `INSERT INTO user_settings (user_id, daily_goal, weekly_goal, settings_json)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       daily_goal = excluded.daily_goal,
       weekly_goal = excluded.weekly_goal,
       settings_json = excluded.settings_json`
  )
    .bind(user, dailyGoal, weeklyGoal, serialized)
    .run();

  await purgeEdgeCache(request, `settings-${user}`);
  return json({ success: true });
}

export async function onRequest({ request }: PagesContext): Promise<Response> {
  return errorJson(`Unsupported method ${request.method}`, 405);
}

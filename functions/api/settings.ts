import { z } from "zod";

import { getSchemaReady } from "../utils/schemaCache";
import { errorJson, handleOptions, json, requireUser, withEdgeCache, purgeEdgeCache, type PagesContext } from "./_shared";

const SETTINGS_COLUMNS = [
  "daily_goal", "weekly_goal", "theme_preset", "font_scale", "line_height",
  "text_width", "motion", "tap_zones", "swipe_nav", "auto_hide_ms",
  "show_progress", "show_page_meta", "accent",
] as const;

export const onRequestOptions = () => handleOptions();

const settingsSchema = z.object({
  dailyGoal: z.number().int().min(1).max(1440).optional().default(30),
  weeklyGoal: z.number().int().min(1).max(10080).optional().default(150),
  themePreset: z.enum(["paper", "dark", "sepia", "night"]).optional().default("paper"),
  fontScale: z.number().int().min(50).max(300).optional().default(100),
  lineHeight: z.number().min(1.0).max(3.0).optional().default(1.6),
  textWidth: z.number().int().min(20).max(100).optional().default(70),
  motion: z.enum(["full", "reduced", "none"]).optional().default("full"),
  tapZones: z.boolean().optional().default(true),
  swipeNav: z.boolean().optional().default(true),
  autoHideMs: z.number().int().min(500).max(30000).optional().default(4500),
  showProgress: z.boolean().optional().default(true),
  showPageMeta: z.boolean().optional().default(true),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#B37A4C"),
});

export async function onRequestGet({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const fetcher = async () => {
    await getSchemaReady(env.SANCTUARY_DB);
    const row = await env.SANCTUARY_DB.prepare(
      `SELECT ${SETTINGS_COLUMNS.join(", ")} FROM user_settings WHERE user_id = ?`
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
  if (!parseResult.success) {
    return errorJson("Invalid settings payload", 400);
  }

  const settings = parseResult.data;

  await getSchemaReady(env.SANCTUARY_DB);
  await env.SANCTUARY_DB.prepare(
    `INSERT INTO user_settings (
      user_id, daily_goal, weekly_goal, theme_preset, font_scale, line_height, text_width,
      motion, tap_zones, swipe_nav, auto_hide_ms, show_progress, show_page_meta, accent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      daily_goal = excluded.daily_goal, weekly_goal = excluded.weekly_goal,
      theme_preset = excluded.theme_preset, font_scale = excluded.font_scale,
      line_height = excluded.line_height, text_width = excluded.text_width,
      motion = excluded.motion, tap_zones = excluded.tap_zones,
      swipe_nav = excluded.swipe_nav, auto_hide_ms = excluded.auto_hide_ms,
      show_progress = excluded.show_progress, show_page_meta = excluded.show_page_meta,
      accent = excluded.accent`
  )
    .bind(
      user, settings.dailyGoal, settings.weeklyGoal, settings.themePreset, 
      settings.fontScale, settings.lineHeight, settings.textWidth,
      settings.motion, settings.tapZones ? 1 : 0, settings.swipeNav ? 1 : 0,
      settings.autoHideMs, settings.showProgress ? 1 : 0, settings.showPageMeta ? 1 : 0, 
      settings.accent
    )
    .run();

  await purgeEdgeCache(request, `settings-${user}`);
  return json({ success: true });
}

export async function onRequest({ request }: PagesContext): Promise<Response> {
  return errorJson(`Unsupported method ${request.method}`, 405);
}

function fromDb(row: Record<string, unknown>) {
  return {
    dailyGoal: Number(row.daily_goal) || 30,
    weeklyGoal: Number(row.weekly_goal) || 150,
    themePreset: String(row.theme_preset || "paper"),
    fontScale: Number(row.font_scale) || 100,
    lineHeight: Number(row.line_height) || 1.6,
    textWidth: Number(row.text_width) || 70,
    motion: String(row.motion || "full"),
    tapZones: Boolean(row.tap_zones),
    swipeNav: Boolean(row.swipe_nav),
    autoHideMs: Number(row.auto_hide_ms) || 4500,
    showProgress: Boolean(row.show_progress),
    showPageMeta: Boolean(row.show_page_meta),
    accent: String(row.accent || "#B37A4C"),
  };
}

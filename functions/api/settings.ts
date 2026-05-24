import { ensureSettingsSchema } from "../utils/schemaBootstrap";
import {
  errorJson,
  json,
  parseJsonObject,
  requireUser,
  type PagesContext,
} from "./_shared";

const SETTINGS_COLUMNS = [
  "daily_goal",
  "weekly_goal",
  "theme_preset",
  "font_scale",
  "line_height",
  "text_width",
  "motion",
  "tap_zones",
  "swipe_nav",
  "auto_hide_ms",
  "show_progress",
  "show_page_meta",
  "accent",
] as const;

export async function onRequestGet({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  await ensureSettingsSchema(env.SANCTUARY_DB);
  const row = await env.SANCTUARY_DB.prepare(`SELECT ${SETTINGS_COLUMNS.join(", ")} FROM user_settings WHERE user_id = ?`)
    .bind(user)
    .first<Record<string, unknown>>();

  return json(row ? fromDb(row) : {});
}

export async function onRequestPut({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const body = await request.text();
  const settings = parseJsonObject(body);
  await ensureSettingsSchema(env.SANCTUARY_DB);

  await env.SANCTUARY_DB.prepare(
    `INSERT INTO user_settings (
      user_id, daily_goal, weekly_goal, theme_preset, font_scale, line_height, text_width,
      motion, tap_zones, swipe_nav, auto_hide_ms, show_progress, show_page_meta, accent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      daily_goal = excluded.daily_goal,
      weekly_goal = excluded.weekly_goal,
      theme_preset = excluded.theme_preset,
      font_scale = excluded.font_scale,
      line_height = excluded.line_height,
      text_width = excluded.text_width,
      motion = excluded.motion,
      tap_zones = excluded.tap_zones,
      swipe_nav = excluded.swipe_nav,
      auto_hide_ms = excluded.auto_hide_ms,
      show_progress = excluded.show_progress,
      show_page_meta = excluded.show_page_meta,
      accent = excluded.accent`
  )
    .bind(
      user,
      numberOr(settings.dailyGoal, 30),
      numberOr(settings.weeklyGoal, 150),
      stringOr(settings.themePreset, "paper"),
      numberOr(settings.fontScale, 100),
      numberOr(settings.lineHeight, 1.6),
      numberOr(settings.textWidth, 70),
      stringOr(settings.motion, "full"),
      boolInt(settings.tapZones, true),
      boolInt(settings.swipeNav, true),
      numberOr(settings.autoHideMs, 4500),
      boolInt(settings.showProgress, true),
      boolInt(settings.showPageMeta, true),
      stringOr(settings.accent, "#B37A4C")
    )
    .run();

  return json({ success: true });
}

export async function onRequest({ request }: PagesContext): Promise<Response> {
  return errorJson(`Unsupported method ${request.method}`, 405);
}

function fromDb(row: Record<string, unknown>) {
  return {
    dailyGoal: numberOr(row.daily_goal, 30),
    weeklyGoal: numberOr(row.weekly_goal, 150),
    themePreset: stringOr(row.theme_preset, "paper"),
    fontScale: numberOr(row.font_scale, 100),
    lineHeight: numberOr(row.line_height, 1.6),
    textWidth: numberOr(row.text_width, 70),
    motion: stringOr(row.motion, "full"),
    tapZones: Boolean(row.tap_zones),
    swipeNav: Boolean(row.swipe_nav),
    autoHideMs: numberOr(row.auto_hide_ms, 4500),
    showProgress: Boolean(row.show_progress),
    showPageMeta: Boolean(row.show_page_meta),
    accent: stringOr(row.accent, "#B37A4C"),
  };
}

function numberOr(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function boolInt(value: unknown, fallback: boolean): number {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value ? 1 : 0;
  return fallback ? 1 : 0;
}

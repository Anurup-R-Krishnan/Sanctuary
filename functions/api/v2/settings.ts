import { getUserId } from "../../utils/auth";
import type { Env } from "../../types";
import { ensureSettingsSchema } from "../../utils/schemaBootstrap";
import { jsonResponse, methodNotAllowed } from "./_shared/http";
import { toIntWithin } from "./_shared/validation";
import { readerSettingsDefaults as defaults } from "./_shared/settings";

interface UserSettingsRow {
  daily_goal: number | null;
  weekly_goal: number | null;
  theme_preset: string;
  font_scale: number;
  line_height: number;
  text_width: number;
  motion: string;
  tap_zones: number;
  swipe_nav: number;
  auto_hide_ms: number;
  show_progress: number;
  show_page_meta: number;
  accent: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await ensureSettingsSchema(env.SANCTUARY_DB);

  if (request.method === "GET") {
    const row = await env.SANCTUARY_DB
      .prepare("SELECT * FROM user_settings WHERE user_id = ?")
      .bind(userId)
      .first<UserSettingsRow>();

    if (!row) {
      return jsonResponse(defaults);
    }

    return jsonResponse({
      dailyGoal: row.daily_goal ?? defaults.dailyGoal,
      weeklyGoal: row.weekly_goal ?? defaults.weeklyGoal,
      themePreset: row.theme_preset,
      fontScale: row.font_scale,
      lineHeight: row.line_height,
      textWidth: row.text_width,
      motion: row.motion,
      tapZones: !!row.tap_zones,
      swipeNav: !!row.swipe_nav,
      autoHideMs: row.auto_hide_ms,
      showProgress: !!row.show_progress,
      showPageMeta: !!row.show_page_meta,
      accent: row.accent
    });
  }

  if (request.method === "PUT") {
    const body: Record<string, unknown> = await request
      .json<Record<string, unknown>>()
      .catch(() => ({} as Record<string, unknown>));
    const payload = {
      ...defaults,
      ...body,
      dailyGoal: toIntWithin(body.dailyGoal, defaults.dailyGoal, 1, 1200),
      weeklyGoal: toIntWithin(body.weeklyGoal, defaults.weeklyGoal, 1, 5000),
      tapZones: body.tapZones === undefined ? defaults.tapZones : !!body.tapZones,
      swipeNav: body.swipeNav === undefined ? defaults.swipeNav : !!body.swipeNav,
      showProgress: body.showProgress === undefined ? defaults.showProgress : !!body.showProgress,
      showPageMeta: body.showPageMeta === undefined ? defaults.showPageMeta : !!body.showPageMeta
    };

    await env.SANCTUARY_DB
      .prepare(
        `INSERT OR REPLACE INTO user_settings (
          user_id, daily_goal, weekly_goal, theme_preset, font_scale, line_height,
          text_width, motion, tap_zones, swipe_nav, auto_hide_ms, show_progress,
          show_page_meta, accent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        payload.dailyGoal,
        payload.weeklyGoal,
        payload.themePreset,
        payload.fontScale,
        payload.lineHeight,
        payload.textWidth,
        payload.motion,
        payload.tapZones ? 1 : 0,
        payload.swipeNav ? 1 : 0,
        payload.autoHideMs,
        payload.showProgress ? 1 : 0,
        payload.showPageMeta ? 1 : 0,
        payload.accent
      )
      .run();

    return jsonResponse({ success: true });
  }

  return methodNotAllowed();
};

import { getUserId } from "../../utils/auth";
import type { Env } from "../../types";
import { ensureSettingsSchema } from "../../utils/schemaBootstrap";

const defaults = {
  themePreset: "paper",
  fontScale: 100,
  lineHeight: 1.6,
  textWidth: 70,
  motion: "full",
  tapZones: true,
  swipeNav: true,
  autoHideMs: 4500,
  showProgress: true,
  showPageMeta: true,
  accent: "#B37A4C"
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await ensureSettingsSchema(env.SANCTUARY_DB);

  if (request.method === "GET") {
    const row = await env.SANCTUARY_DB
      .prepare("SELECT * FROM user_settings WHERE user_id = ?")
      .bind(userId)
      .first<any>();

    if (!row) {
      return new Response(JSON.stringify(defaults), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
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
    }), { headers: { "Content-Type": "application/json" } });
  }

  if (request.method === "PUT") {
    const body = await request.json<any>().catch(() => ({}));
    const payload = {
      ...defaults,
      ...body,
      tapZones: !!body.tapZones,
      swipeNav: !!body.swipeNav,
      showProgress: !!body.showProgress,
      showPageMeta: !!body.showPageMeta
    };

    await env.SANCTUARY_DB
      .prepare(
        `INSERT OR REPLACE INTO user_settings (
          user_id, daily_goal, weekly_goal, theme_preset, font_scale, line_height,
          text_width, motion, tap_zones, swipe_nav, auto_hide_ms, show_progress,
          show_page_meta, accent
        ) VALUES (?, 30, 150, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
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

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};

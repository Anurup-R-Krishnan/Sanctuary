import { getUserId } from "../utils/auth";
import type { Env } from "../types";
import { hasColumn } from "../utils/dbSchema";
import { ensureSettingsSchema } from "../utils/schemaBootstrap";

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const method = request.method;

    // Authenticate
    const userId = await getUserId(request, env);
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        await ensureSettingsSchema(env.SANCTUARY_DB);
        const userScoped = await hasColumn(env.SANCTUARY_DB, "user_settings", "user_id");

        if (method === "GET") {
            const settings = userScoped
                ? await env.SANCTUARY_DB.prepare("SELECT * FROM user_settings WHERE user_id = ?").bind(userId).first()
                : await env.SANCTUARY_DB.prepare("SELECT * FROM user_settings LIMIT 1").first();

            if (!settings) {
                // Return default settings if none found or handle 404
                // For now, let's return null and let frontend handle default
                return new Response(JSON.stringify(null), { headers: { "Content-Type": "application/json" } });
            }

            // Map DB snake_case to camelCase
            const camelSettings = {
                dailyGoal: settings.daily_goal,
                weeklyGoal: settings.weekly_goal,
                themeColor: settings.theme_color,
                showStreakReminder: !!settings.show_streak_reminder,
                reduceMotion: !!settings.reduce_motion,
                fontSize: settings.font_size,
                lineHeight: settings.line_height,
                fontPairing: settings.font_pairing,
                textAlignment: settings.text_alignment,
                maxTextWidth: settings.max_text_width,
                hyphenation: !!settings.hyphenation,
                pageMargin: settings.page_margin,
                paragraphSpacing: settings.paragraph_spacing,
                readerForeground: settings.reader_foreground,
                readerBackground: settings.reader_background,
                readerAccent: settings.reader_accent,
                continuous: !!settings.continuous,
                spread: !!settings.spread,
                brightness: settings.brightness,
                grayscale: !!settings.grayscale,
                showScrollbar: !!settings.show_scrollbar,
                screenReaderMode: false, // Not in DB yet?
            };

            return new Response(JSON.stringify(camelSettings), { headers: { "Content-Type": "application/json" } });
        }

        if (method === "PUT") {
            let incoming: any = {};
            try {
                const contentType = request.headers.get("content-type") || "";
                if (contentType.includes("application/json")) {
                    incoming = await request.json();
                }
            } catch {
                incoming = {};
            }
            const settings = {
                dailyGoal: Number.isFinite(incoming?.dailyGoal) ? incoming.dailyGoal : 30,
                weeklyGoal: Number.isFinite(incoming?.weeklyGoal) ? incoming.weeklyGoal : 150,
                themeColor: incoming?.themeColor ?? "amber",
                showStreakReminder: !!incoming?.showStreakReminder,
                reduceMotion: !!incoming?.reduceMotion,
                fontSize: Number.isFinite(incoming?.fontSize) ? incoming.fontSize : 18,
                lineHeight: Number.isFinite(incoming?.lineHeight) ? incoming.lineHeight : 1.6,
                fontPairing: incoming?.fontPairing ?? "merriweather-georgia",
                textAlignment: incoming?.textAlignment ?? "justify",
                maxTextWidth: Number.isFinite(incoming?.maxTextWidth) ? incoming.maxTextWidth : 65,
                hyphenation: incoming?.hyphenation !== undefined ? !!incoming.hyphenation : true,
                pageMargin: Number.isFinite(incoming?.pageMargin) ? incoming.pageMargin : 40,
                paragraphSpacing: Number.isFinite(incoming?.paragraphSpacing) ? incoming.paragraphSpacing : 20,
                readerForeground: incoming?.readerForeground ?? "#2d2a24",
                readerBackground: incoming?.readerBackground ?? "#fefcf8",
                readerAccent: incoming?.readerAccent ?? "#b8956c",
                continuous: !!incoming?.continuous,
                spread: incoming?.spread !== undefined ? !!incoming.spread : true,
                brightness: Number.isFinite(incoming?.brightness) ? incoming.brightness : 100,
                grayscale: !!incoming?.grayscale,
                showScrollbar: !!incoming?.showScrollbar,
            };

            if (userScoped) {
                await env.SANCTUARY_DB.prepare(
                    `INSERT OR REPLACE INTO user_settings (
                        user_id, daily_goal, weekly_goal, theme_color, show_streak_reminder, reduce_motion,
                        font_size, line_height, font_pairing, text_alignment, max_text_width, hyphenation,
                        page_margin, paragraph_spacing, reader_foreground, reader_background, reader_accent,
                        continuous, spread, brightness, grayscale, show_scrollbar
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    userId,
                    settings.dailyGoal,
                    settings.weeklyGoal,
                    settings.themeColor,
                    settings.showStreakReminder ? 1 : 0,
                    settings.reduceMotion ? 1 : 0,
                    settings.fontSize,
                    settings.lineHeight,
                    settings.fontPairing,
                    settings.textAlignment,
                    settings.maxTextWidth,
                    settings.hyphenation ? 1 : 0,
                    settings.pageMargin,
                    settings.paragraphSpacing,
                    settings.readerForeground,
                    settings.readerBackground,
                    settings.readerAccent,
                    settings.continuous ? 1 : 0,
                    settings.spread ? 1 : 0,
                    settings.brightness,
                    settings.grayscale ? 1 : 0,
                    settings.showScrollbar ? 1 : 0
                ).run();
            } else {
                await env.SANCTUARY_DB.prepare("DELETE FROM user_settings").run();
                await env.SANCTUARY_DB.prepare(
                    `INSERT INTO user_settings (
                        daily_goal, weekly_goal, theme_color, show_streak_reminder, reduce_motion,
                        font_size, line_height, font_pairing, text_alignment, max_text_width, hyphenation,
                        page_margin, paragraph_spacing, reader_foreground, reader_background, reader_accent,
                        continuous, spread, brightness, grayscale, show_scrollbar
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    settings.dailyGoal,
                    settings.weeklyGoal,
                    settings.themeColor,
                    settings.showStreakReminder ? 1 : 0,
                    settings.reduceMotion ? 1 : 0,
                    settings.fontSize,
                    settings.lineHeight,
                    settings.fontPairing,
                    settings.textAlignment,
                    settings.maxTextWidth,
                    settings.hyphenation ? 1 : 0,
                    settings.pageMargin,
                    settings.paragraphSpacing,
                    settings.readerForeground,
                    settings.readerBackground,
                    settings.readerAccent,
                    settings.continuous ? 1 : 0,
                    settings.spread ? 1 : 0,
                    settings.brightness,
                    settings.grayscale ? 1 : 0,
                    settings.showScrollbar ? 1 : 0
                ).run();
            }

            return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        return new Response("Method not allowed", { status: 405 });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};

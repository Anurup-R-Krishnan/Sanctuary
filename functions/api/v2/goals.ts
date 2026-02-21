import { getUserId } from "../../utils/auth";
import type { Env } from "../../types";
import { ensureSessionsSchema, ensureSettingsSchema } from "../../utils/schemaBootstrap";
import { jsonResponse, methodNotAllowed } from "./_shared/http";
import { readerSettingsDefaults } from "./_shared/settings";

interface SumRow {
  total_sec: number | null;
}

interface GoalSettingsRow {
  daily_goal: number | null;
  weekly_goal: number | null;
}

function startOfUtcDay(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0));
}

function startOfUtcWeek(input: Date): Date {
  const day = input.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate() + mondayOffset, 0, 0, 0, 0));
}

function isoDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function clampPercent(total: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((total / target) * 100)));
}

async function sumDurationSec(db: D1Database, userId: string, startIso: string, endIso: string) {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(duration_sec), 0) AS total_sec
       FROM reading_sessions
       WHERE user_id = ? AND started_at >= ? AND started_at < ?`
    )
    .bind(userId, startIso, endIso)
    .first<SumRow>();
  return Math.max(0, Number(row?.total_sec || 0));
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "GET") return methodNotAllowed();

  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await ensureSessionsSchema(env.SANCTUARY_DB);
  await ensureSettingsSchema(env.SANCTUARY_DB);

  const now = new Date();
  const dayStart = startOfUtcDay(now);
  const dayEnd = new Date(dayStart.getTime() + (24 * 60 * 60 * 1000));
  const weekStart = startOfUtcWeek(now);
  const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));

  const [dayTotalSec, weekTotalSec, settings] = await Promise.all([
    sumDurationSec(env.SANCTUARY_DB, userId, dayStart.toISOString(), dayEnd.toISOString()),
    sumDurationSec(env.SANCTUARY_DB, userId, weekStart.toISOString(), weekEnd.toISOString()),
    env.SANCTUARY_DB.prepare("SELECT daily_goal, weekly_goal FROM user_settings WHERE user_id = ?")
      .bind(userId)
      .first<GoalSettingsRow>()
  ]);

  const dailyTarget = Math.max(1, Number(settings?.daily_goal || readerSettingsDefaults.dailyGoal));
  const weeklyTarget = Math.max(1, Number(settings?.weekly_goal || readerSettingsDefaults.weeklyGoal));
  const dayMinutes = Math.round(dayTotalSec / 60);
  const weekMinutes = Math.round(weekTotalSec / 60);

  return jsonResponse({
    day: {
      date: isoDateOnly(dayStart),
      totalMinutes: dayMinutes,
      targetMinutes: dailyTarget,
      progressPercent: clampPercent(dayMinutes, dailyTarget)
    },
    week: {
      startDate: isoDateOnly(weekStart),
      endDate: isoDateOnly(new Date(weekEnd.getTime() - 1)),
      totalMinutes: weekMinutes,
      targetMinutes: weeklyTarget,
      progressPercent: clampPercent(weekMinutes, weeklyTarget)
    }
  });
};

import { getSchemaReady } from "../utils/schemaCache";
import { handleOptions, json, requireUser, type PagesContext } from "./_shared";

export const onRequestOptions = () => handleOptions();

export async function onRequestGet({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  await getSchemaReady(env.SANCTUARY_DB);

  const settings = await env.SANCTUARY_DB.prepare(
    "SELECT daily_goal, weekly_goal FROM user_settings WHERE user_id = ?"
  ).bind(user).first<{ daily_goal?: number; weekly_goal?: number }>();

  const dailyGoal = numberOr(settings?.daily_goal, 30);
  const weeklyGoal = numberOr(settings?.weekly_goal, 150);
  const monthGoal = weeklyGoal * 4;

  const now = new Date();
  const dayStart = localDateKey(now);
  const weekStart = localDateKey(startOfWeek(now));
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  // Single query — aggregate all three windows in one D1 round trip.
  const row = await env.SANCTUARY_DB.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN substr(started_at,1,10) >= ? THEN duration_sec ELSE 0 END), 0) AS day_sec,
       COALESCE(SUM(CASE WHEN substr(started_at,1,10) >= ? THEN duration_sec ELSE 0 END), 0) AS week_sec,
       COALESCE(SUM(CASE WHEN substr(started_at,1,10) >= ? THEN duration_sec ELSE 0 END), 0) AS month_sec
     FROM reading_sessions
     WHERE user_id = ? AND substr(started_at,1,10) >= ?`
  ).bind(dayStart, weekStart, monthStart, user, monthStart)
    .first<{ day_sec: number; week_sec: number; month_sec: number }>();

  const toMin = (sec: number) => Math.round(numberOr(sec, 0) / 60);

  return json({
    day: goalWindow(dailyGoal, toMin(row?.day_sec ?? 0)),
    week: goalWindow(weeklyGoal, toMin(row?.week_sec ?? 0)),
    month: goalWindow(monthGoal, toMin(row?.month_sec ?? 0)),
  });
}

function goalWindow(goal: number, minutes: number) {
  return {
    goal,
    minutes,
    targetMinutes: goal,
    totalMinutes: minutes,
    progressPercent: goal > 0 ? Math.min(100, Math.round((minutes / goal) * 100)) : 0,
  };
}

function startOfWeek(date: Date): Date {
  const clone = new Date(date);
  clone.setDate(clone.getDate() - ((clone.getDay() + 6) % 7));
  return clone;
}

function localDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function numberOr(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

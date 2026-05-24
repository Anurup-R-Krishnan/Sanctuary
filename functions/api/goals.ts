import { ensureSessionsSchema, ensureSettingsSchema } from "../utils/schemaBootstrap";
import { json, requireUser, type PagesContext } from "./_shared";

export async function onRequestGet({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  await Promise.all([
    ensureSettingsSchema(env.SANCTUARY_DB),
    ensureSessionsSchema(env.SANCTUARY_DB),
  ]);

  const settings = await env.SANCTUARY_DB.prepare("SELECT daily_goal, weekly_goal FROM user_settings WHERE user_id = ?")
    .bind(user)
    .first<{ daily_goal?: number; weekly_goal?: number }>();

  const dailyGoal = numberOr(settings?.daily_goal, 30);
  const weeklyGoal = numberOr(settings?.weekly_goal, 150);
  const monthGoal = weeklyGoal * 4;
  const now = new Date();
  const dayStart = localDateKey(now);
  const weekStart = localDateKey(startOfWeek(now));
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [dayMinutes, weekMinutes, monthMinutes] = await Promise.all([
    minutesSince(env.SANCTUARY_DB, user, dayStart),
    minutesSince(env.SANCTUARY_DB, user, weekStart),
    minutesSince(env.SANCTUARY_DB, user, monthStart),
  ]);

  return json({
    day: goalWindow(dailyGoal, dayMinutes),
    week: goalWindow(weeklyGoal, weekMinutes),
    month: goalWindow(monthGoal, monthMinutes),
  });
}

async function minutesSince(db: D1Database, userId: string, sinceDate: string): Promise<number> {
  const row = await db.prepare(
    `SELECT COALESCE(SUM(duration_sec), 0) AS duration_sec
     FROM reading_sessions
     WHERE user_id = ? AND substr(started_at, 1, 10) >= ?`
  ).bind(userId, sinceDate).first<{ duration_sec?: number }>();

  return Math.round(numberOr(row?.duration_sec, 0) / 60);
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
  const day = (clone.getDay() + 6) % 7;
  clone.setDate(clone.getDate() - day);
  return clone;
}

function localDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function numberOr(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

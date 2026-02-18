import { getUserId } from "../../utils/auth";
import type { Env } from "../../types";
import { ensureSessionsSchema } from "../../utils/schemaBootstrap";

interface SessionRow {
  id: string;
  user_id: string;
  book_id: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number;
  pages_advanced: number;
  device: string;
}

interface SessionPayload {
  id?: string;
  bookId?: string;
  startedAt?: string;
  endedAt?: string | null;
  durationSec?: number;
  pagesAdvanced?: number;
  device?: "android" | "desktop" | "web";
}

function toIsoDateOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toFinite(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await ensureSessionsSchema(env.SANCTUARY_DB);

  if (request.method === "GET") {
    const data = await env.SANCTUARY_DB
      .prepare("SELECT * FROM reading_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 200")
      .bind(userId)
      .all<SessionRow>();

    const items = (data.results || []).map((row) => ({
      id: row.id,
      bookId: row.book_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationSec: row.duration_sec,
      pagesAdvanced: row.pages_advanced,
      device: row.device
    }));

    return new Response(JSON.stringify(items), { headers: { "Content-Type": "application/json" } });
  }

  if (request.method === "POST") {
    const body = (await request.json<SessionPayload>().catch(() => ({}))) as SessionPayload;
    if (typeof body.bookId !== "string" || body.bookId.trim().length === 0) {
      return new Response("Invalid bookId", { status: 400 });
    }

    const id = typeof body.id === "string" && body.id.trim().length > 0
      ? body.id.trim()
      : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const startedAt = toIsoDateOrNull(body.startedAt) || new Date().toISOString();
    const endedAt = body.endedAt === null ? null : toIsoDateOrNull(body.endedAt);
    const durationSec = Math.max(0, Math.round(toFinite(body.durationSec, 0)));
    const pagesAdvanced = Math.max(0, Math.round(toFinite(body.pagesAdvanced, 0)));
    const device = body.device === "android" || body.device === "desktop" || body.device === "web"
      ? body.device
      : "web";

    await env.SANCTUARY_DB
      .prepare(
        `INSERT OR REPLACE INTO reading_sessions (
          id, user_id, book_id, started_at, ended_at, duration_sec, pages_advanced, device
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        body.bookId.trim(),
        startedAt,
        endedAt,
        durationSec,
        pagesAdvanced,
        device
      )
      .run();

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405 });
};

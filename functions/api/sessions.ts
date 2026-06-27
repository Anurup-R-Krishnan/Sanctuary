import { z } from "zod";

import { getSchemaReady } from "../utils/schemaCache";
import { errorJson, handleOptions, json, requireUser, type PagesContext } from "./_shared";

interface SessionRow {
  book_id: string;
  book_title: string;
  date: string;
  device: string;
  duration_sec: number;
  ended_at: string | null;
  id: string;
  local_start_hour: number | null;
  pages_advanced: number;
  started_at: string;
}

export const onRequestOptions = () => handleOptions();

const sessionSchema = z.object({
  id: z.string().optional(),
  bookId: z.string().min(1),
  bookTitle: z.string().optional().default(""),
  startedAt: z.string().min(1),
  endedAt: z.string().nullable().optional(),
  date: z.string().min(1),
  durationSec: z.number().int().min(0).max(86400).optional().default(0),
  pagesAdvanced: z.number().int().min(0).max(100000).optional().default(0),
  device: z.enum(["web", "desktop", "mobile"]).optional().default("web"),
  localStartHour: z.number().int().min(0).max(23).nullable().optional(),
});

export async function onRequestGet({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  await getSchemaReady(env.SANCTUARY_DB);

  const since = new URL(request.url).searchParams.get("since");
  const result = since
    ? await env.SANCTUARY_DB.prepare(
        "SELECT * FROM reading_sessions WHERE user_id = ? AND date >= ? ORDER BY date DESC"
      ).bind(user, since).all<SessionRow>()
    : await env.SANCTUARY_DB.prepare(
        "SELECT * FROM reading_sessions WHERE user_id = ? ORDER BY date DESC"
      ).bind(user).all<SessionRow>();

  return json((result.results || []).map(toSession));
}

export async function onRequestPost({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJson("Invalid JSON body", 400);
  }

  const parseResult = sessionSchema.safeParse(body);
  if (!parseResult.success) {
    return errorJson("Invalid session payload", 400);
  }

  const data = parseResult.data;
  const id = data.id || crypto.randomUUID();
  const localStartHour = data.localStartHour !== undefined ? data.localStartHour : null;
  const endedAt = data.endedAt !== undefined ? data.endedAt : null;

  await getSchemaReady(env.SANCTUARY_DB);
  await env.SANCTUARY_DB.prepare(
    `INSERT INTO reading_sessions
       (id, user_id, book_id, book_title, started_at, ended_at, duration_sec, pages_advanced, device, date, local_start_hour)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`
  ).bind(
    id, user, data.bookId, data.bookTitle, data.startedAt, endedAt, 
    data.durationSec, data.pagesAdvanced, data.device, data.date, localStartHour
  ).run();

  return json({ success: true, id }, { status: 201 });
}

export async function onRequestDelete({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return errorJson("Missing session id", 400);

  await getSchemaReady(env.SANCTUARY_DB);
  await env.SANCTUARY_DB.prepare(
    "DELETE FROM reading_sessions WHERE id = ? AND user_id = ?"
  ).bind(id, user).run();

  return json({ success: true });
}

function toSession(row: SessionRow) {
  return {
    id: row.id,
    bookId: row.book_id,
    bookTitle: row.book_title,
    startedAt: row.started_at,
    startTime: row.started_at,
    endedAt: row.ended_at,
    duration: row.duration_sec,
    pagesRead: row.pages_advanced,
    device: row.device,
    date: row.date,
    localStartHour: row.local_start_hour ?? undefined,
  };
}

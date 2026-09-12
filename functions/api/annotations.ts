import { z } from "zod";

import { getSchemaReady } from "../utils/schemaCache";
import { errorJson, handleOptions, json, requireUser, type PagesContext } from "./_shared";

interface AnnotationRow {
  book_id: string;
  cfi: string;
  chapter_label: string | null;
  color: string;
  created_at: string;
  deleted: number;
  href: string | null;
  id: string;
  note: string | null;
  text: string;
  type: string;
  updated_at: string;
  user_id: string;
}

export const onRequestOptions = () => handleOptions();

const annotationSchema = z.object({
  bookId: z.string().min(1),
  cfi: z.string().min(1),
  chapterLabel: z.string().nullable().optional(),
  color: z.string().optional().default("#facc15"),
  createdAt: z.string().optional(),
  href: z.string().nullable().optional(),
  id: z.string().optional(),
  note: z.string().nullable().optional(),
  text: z.string().default(""),
  type: z.enum(["highlight", "underline", "note"]).optional().default("highlight"),
  updatedAt: z.string().optional(),
});

export async function onRequestGet({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  await getSchemaReady(env.SANCTUARY_DB);

  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId");

  const query = bookId
    ? "SELECT * FROM annotations WHERE user_id = ? AND book_id = ? AND deleted = 0 ORDER BY updated_at DESC"
    : "SELECT * FROM annotations WHERE user_id = ? AND deleted = 0 ORDER BY updated_at DESC";

  const result = bookId
    ? await env.SANCTUARY_DB.prepare(query).bind(user, bookId).all<AnnotationRow>()
    : await env.SANCTUARY_DB.prepare(query).bind(user).all<AnnotationRow>();

  return json((result.results || []).map(toAnnotation));
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

  const parseResult = annotationSchema.safeParse(body);
  if (!parseResult.success) {
    return errorJson("Invalid annotation payload", 400);
  }

  const data = parseResult.data;
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const createdAt = data.createdAt || now;
  const updatedAt = data.updatedAt || now;

  await getSchemaReady(env.SANCTUARY_DB);
  await env.SANCTUARY_DB.prepare(
    `INSERT INTO annotations
       (id, user_id, book_id, cfi, chapter_label, href, text, note, color, type, created_at, updated_at, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       chapter_label = excluded.chapter_label,
       href = excluded.href,
       text = excluded.text,
       note = excluded.note,
       color = excluded.color,
       type = excluded.type,
       updated_at = excluded.updated_at,
       deleted = 0`
  ).bind(
    id,
    user,
    data.bookId,
    data.cfi,
    data.chapterLabel ?? null,
    data.href ?? null,
    data.text,
    data.note ?? null,
    data.color,
    data.type,
    createdAt,
    updatedAt
  ).run();

  return json({ id, success: true }, { status: 201 });
}

export async function onRequestDelete({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return errorJson("Missing annotation id", 400);

  const now = new Date().toISOString();
  await getSchemaReady(env.SANCTUARY_DB);
  await env.SANCTUARY_DB.prepare(
    "UPDATE annotations SET deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?"
  ).bind(now, id, user).run();

  return json({ success: true });
}

function toAnnotation(row: AnnotationRow) {
  return {
    bookId: row.book_id,
    cfi: row.cfi,
    chapterLabel: row.chapter_label ?? undefined,
    color: row.color,
    createdAt: row.created_at,
    href: row.href ?? undefined,
    id: row.id,
    note: row.note ?? undefined,
    text: row.text,
    type: row.type,
    updatedAt: row.updated_at,
  };
}

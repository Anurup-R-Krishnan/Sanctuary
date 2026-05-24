import { ensureBooksSchema } from "../utils/schemaBootstrap";
import {
  clampProgress,
  contentKey,
  contentUrl,
  coverKey,
  errorJson,
  json,
  normalizeBookmarks,
  normalizeBookmarksJson,
  normalizeTotalPages,
  optionalText,
  requiredText,
  requireUser,
  toLibraryItem,
  type BookRow,
  type PagesContext,
} from "./_shared";

type PatchField = {
  column: string;
  value: number | string | null;
};

export async function onRequestGet({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  await ensureBooksSchema(env.SANCTUARY_DB);
  const result = await env.SANCTUARY_DB.prepare(
    `SELECT id, title, author, cover_url, content_type, progress, total_pages,
      last_location, bookmarks_json, is_favorite, updated_at
     FROM books
     WHERE user_id = ?
     ORDER BY updated_at DESC`
  ).bind(user).all<BookRow>();

  return json((result.results || []).map(toLibraryItem));
}

export async function onRequestPost({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const form = await request.formData();
  const file = form.get("file");
  const metadata = parseMetadata(form.get("metadata"));
  if (!(file instanceof File)) return errorJson("Missing EPUB file", 400);

  await ensureBooksSchema(env.SANCTUARY_DB);

  const id = requiredText(metadata.id, crypto.randomUUID());
  const title = requiredText(metadata.title, "Untitled");
  const author = requiredText(metadata.author, "Unknown");
  const progress = clampProgress(metadata.progress);
  const totalPages = normalizeTotalPages(metadata.totalPages);
  const lastLocation = optionalText(metadata.lastLocation);
  const favorite = metadata.favorite === true ? 1 : 0;
  const bookmarksJson = normalizeBookmarksJson(metadata.bookmarks);
  const now = new Date().toISOString();
  const epubKey = contentKey(user, id);
  const contentType = file.type || "application/epub+zip";

  await env.SANCTUARY_BUCKET.put(epubKey, file.stream(), {
    httpMetadata: { contentType },
  });

  let coverUrl = optionalText(metadata.coverUrl);
  const cover = form.get("cover");
  if (cover instanceof File && cover.size > 0) {
    await env.SANCTUARY_BUCKET.put(coverKey(user, id), cover.stream(), {
      httpMetadata: { contentType: cover.type || "image/jpeg" },
    });
    coverUrl = contentUrl(id, "cover");
  }

  await env.SANCTUARY_DB.prepare(
    `INSERT INTO books (
      id, user_id, title, author, cover_url, content_hash, content_type,
      progress, total_pages, last_location, bookmarks_json, is_favorite, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      author = excluded.author,
      cover_url = excluded.cover_url,
      content_hash = excluded.content_hash,
      content_type = excluded.content_type,
      progress = excluded.progress,
      total_pages = excluded.total_pages,
      last_location = excluded.last_location,
      bookmarks_json = excluded.bookmarks_json,
      is_favorite = excluded.is_favorite,
      updated_at = excluded.updated_at`
  )
    .bind(id, user, title, author, coverUrl, epubKey, contentType, progress, totalPages, lastLocation, bookmarksJson, favorite, now)
    .run();

  return json({ success: true, coverUrl });
}

export async function onRequestPatch({ env, request }: PagesContext): Promise<Response> {
  const context = await requireBookContext(request, env);
  if (context instanceof Response) return context;

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const fields: PatchField[] = [];

  if (body.title !== undefined) fields.push({ column: "title", value: requiredText(body.title, "Untitled") });
  if (body.author !== undefined) fields.push({ column: "author", value: requiredText(body.author, "Unknown") });
  if (body.coverUrl !== undefined) fields.push({ column: "cover_url", value: optionalText(body.coverUrl) });
  if (body.progress !== undefined) fields.push({ column: "progress", value: clampProgress(body.progress) });
  if (body.totalPages !== undefined) fields.push({ column: "total_pages", value: normalizeTotalPages(body.totalPages) });
  if (body.lastLocation !== undefined) fields.push({ column: "last_location", value: optionalText(body.lastLocation) });
  if (body.favorite !== undefined) fields.push({ column: "is_favorite", value: body.favorite === true ? 1 : 0 });
  if (body.bookmarks !== undefined) fields.push({ column: "bookmarks_json", value: JSON.stringify(normalizeBookmarks(body.bookmarks)) });

  if (fields.length === 0) return json({ success: true });

  await ensureBooksSchema(env.SANCTUARY_DB);
  fields.push({ column: "updated_at", value: new Date().toISOString() });
  const assignments = fields.map((field) => `${field.column} = ?`).join(", ");
  await env.SANCTUARY_DB.prepare(`UPDATE books SET ${assignments} WHERE id = ? AND user_id = ?`)
    .bind(...fields.map((field) => field.value), context.id, context.user)
    .run();

  return json({ success: true });
}

export async function onRequestDelete({ env, request }: PagesContext): Promise<Response> {
  const context = await requireBookContext(request, env);
  if (context instanceof Response) return context;

  await ensureBooksSchema(env.SANCTUARY_DB);
  await env.SANCTUARY_DB.prepare("DELETE FROM books WHERE id = ? AND user_id = ?").bind(context.id, context.user).run();
  await Promise.all([
    env.SANCTUARY_BUCKET.delete(contentKey(context.user, context.id)),
    env.SANCTUARY_BUCKET.delete(coverKey(context.user, context.id)),
  ]);

  return json({ success: true });
}

async function requireBookContext(request: Request, env: Parameters<typeof requireUser>[1]): Promise<Response | { id: string; user: string }> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;
  const id = new URL(request.url).searchParams.get("id");
  return id ? { id, user } : errorJson("Missing book id", 400);
}

function parseMetadata(value: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

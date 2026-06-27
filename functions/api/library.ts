import { z } from "zod";

import { getSchemaReady } from "../utils/schemaCache";
import {
  contentKey,
  contentUrl,
  coverKey,
  errorJson,
  handleOptions,
  isValidEpub,
  json,
  MAX_EPUB_BYTES,
  requireUser,
  toLibraryItem,
  withEdgeCache,
  purgeEdgeCache,
  type BookRow,
  type PagesContext,
} from "./_shared";

export const onRequestOptions = () => handleOptions();

const bookmarkSchema = z.object({
  cfi: z.string().min(1),
  title: z.string().optional()
});

const metadataSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  author: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  totalPages: z.number().min(1).optional(),
  lastLocation: z.string().nullable().optional(),
  favorite: z.boolean().optional(),
  coverUrl: z.string().nullable().optional(),
  bookmarks: z.array(bookmarkSchema).optional()
}).catchall(z.unknown());

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  coverUrl: z.string().nullable().optional(),
  progress: z.number().min(0).max(100).optional(),
  totalPages: z.number().min(1).optional(),
  lastLocation: z.string().nullable().optional(),
  favorite: z.boolean().optional(),
  bookmarks: z.array(bookmarkSchema).optional()
});

export async function onRequestGet({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  
  const fetcher = async () => {
    await getSchemaReady(env.SANCTUARY_DB);
    let result;

    if (search && search.trim().length > 0) {
      const safeSearch = search.trim().replace(/"/g, '""') + '*';
      const query = `
        SELECT b.id, b.title, b.author, b.cover_url, b.content_type, b.progress, b.total_pages,
          b.last_location, b.bookmarks_json, b.is_favorite, b.updated_at
        FROM books b
        JOIN books_fts fts ON b.id = fts.id
        WHERE fts.user_id = ? AND books_fts MATCH ?
        ORDER BY rank
      `;
      result = await env.SANCTUARY_DB.prepare(query).bind(user, safeSearch).all<BookRow>();
    } else {
      result = await env.SANCTUARY_DB.prepare(
        `SELECT id, title, author, cover_url, content_type, progress, total_pages,
          last_location, bookmarks_json, is_favorite, updated_at
         FROM books WHERE user_id = ? ORDER BY updated_at DESC`
      ).bind(user).all<BookRow>();
    }
    return json((result.results || []).map(toLibraryItem));
  };

  if (search) return fetcher();
  return withEdgeCache(request, `library-${user}`, fetcher);
}

export async function onRequestPost({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return errorJson("Missing EPUB file", 400);
  if (file.size > MAX_EPUB_BYTES) return errorJson("File too large (max 150 MB)", 413);
  if (!(await isValidEpub(file))) return errorJson("File is not a valid EPUB", 415);

  let metaRaw: Record<string, unknown> = {};
  try {
    const rawForm = form.get("metadata");
    if (typeof rawForm === "string") {
      metaRaw = JSON.parse(rawForm);
    }
  } catch {
    // Ignore invalid JSON
  }

  const parseResult = metadataSchema.safeParse(metaRaw);
  if (!parseResult.success) {
    return errorJson("Invalid metadata payload", 400);
  }
  
  const metadata = parseResult.data;
  await getSchemaReady(env.SANCTUARY_DB);

  const id = metadata.id?.trim() || crypto.randomUUID();
  const title = metadata.title?.trim() || "Untitled";
  const author = metadata.author?.trim() || "Unknown";
  const progress = metadata.progress || 0;
  const totalPages = metadata.totalPages || 100;
  const lastLocation = metadata.lastLocation || null;
  const favorite = metadata.favorite === true ? 1 : 0;
  const bookmarksJson = JSON.stringify(metadata.bookmarks || []);
  const now = new Date().toISOString();
  const epubKey = contentKey(user, id);
  const contentType = file.type || "application/epub+zip";

  await env.SANCTUARY_BUCKET.put(epubKey, file.stream(), { httpMetadata: { contentType } });

  let coverUrl = metadata.coverUrl || null;
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
      title = excluded.title, author = excluded.author,
      cover_url = excluded.cover_url, content_hash = excluded.content_hash,
      content_type = excluded.content_type, progress = excluded.progress,
      total_pages = excluded.total_pages, last_location = excluded.last_location,
      bookmarks_json = excluded.bookmarks_json, is_favorite = excluded.is_favorite,
      updated_at = excluded.updated_at`
  )
    .bind(id, user, title, author, coverUrl, epubKey, contentType, progress, totalPages, lastLocation, bookmarksJson, favorite, now)
    .run();

  await purgeEdgeCache(request, `library-${user}`);
  return json({ success: true, coverUrl });
}

export async function onRequestPatch({ env, request }: PagesContext): Promise<Response> {
  const context = await requireBookContext(request, env);
  if (context instanceof Response) return context;

  const body = await request.json().catch(() => ({}));
  const parseResult = patchSchema.safeParse(body);
  if (!parseResult.success) {
    return errorJson("Invalid patch payload", 400);
  }

  const patch = parseResult.data;
  type PatchField = { column: string; value: number | string | null };
  const fields: PatchField[] = [];

  if (patch.title !== undefined) fields.push({ column: "title", value: patch.title });
  if (patch.author !== undefined) fields.push({ column: "author", value: patch.author });
  if (patch.coverUrl !== undefined) fields.push({ column: "cover_url", value: patch.coverUrl });
  if (patch.progress !== undefined) fields.push({ column: "progress", value: patch.progress });
  if (patch.totalPages !== undefined) fields.push({ column: "total_pages", value: patch.totalPages });
  if (patch.lastLocation !== undefined) fields.push({ column: "last_location", value: patch.lastLocation });
  if (patch.favorite !== undefined) fields.push({ column: "is_favorite", value: patch.favorite ? 1 : 0 });
  if (patch.bookmarks !== undefined) fields.push({ column: "bookmarks_json", value: JSON.stringify(patch.bookmarks) });

  if (fields.length === 0) return json({ success: true });

  await getSchemaReady(env.SANCTUARY_DB);
  fields.push({ column: "updated_at", value: new Date().toISOString() });
  
  const assignments = fields.map((f) => `${f.column} = ?`).join(", ");
  await env.SANCTUARY_DB.prepare(`UPDATE books SET ${assignments} WHERE id = ? AND user_id = ?`)
    .bind(...fields.map((f) => f.value), context.id, context.user)
    .run();

  await purgeEdgeCache(request, `library-${context.user}`);
  return json({ success: true });
}

export async function onRequestDelete({ env, request }: PagesContext): Promise<Response> {
  const context = await requireBookContext(request, env);
  if (context instanceof Response) return context;

  await getSchemaReady(env.SANCTUARY_DB);
  await env.SANCTUARY_DB.prepare("DELETE FROM books WHERE id = ? AND user_id = ?")
    .bind(context.id, context.user).run();

  await Promise.all([
    env.SANCTUARY_BUCKET.delete(contentKey(context.user, context.id)),
    env.SANCTUARY_BUCKET.delete(coverKey(context.user, context.id)),
  ]);

  await purgeEdgeCache(request, `library-${context.user}`);
  return json({ success: true });
}

async function requireBookContext(
  request: Request,
  env: Parameters<typeof requireUser>[1]
): Promise<Response | { id: string; user: string }> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;
  const id = new URL(request.url).searchParams.get("id");
  return id ? { id, user } : errorJson("Missing book id", 400);
}

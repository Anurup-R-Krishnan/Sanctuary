import { getUserId } from "../../utils/auth";
import type { Env } from "../../types";
import { ensureBooksSchema } from "../../utils/schemaBootstrap";

interface BookRow {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  progress: number;
  total_pages: number;
  last_location: string | null;
  bookmarks_json: string | null;
  is_favorite: number;
  updated_at: string;
}

interface LibraryPatchPayload {
  title?: string;
  author?: string;
  progress?: number;
  totalPages?: number;
  lastLocation?: string;
  favorite?: boolean;
  bookmarks?: Array<{ cfi: string; title: string }>;
}

function toFiniteNumber(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeBookmarks(input: unknown): Array<{ cfi: string; title: string }> | null {
  if (!Array.isArray(input)) return null;
  const out: Array<{ cfi: string; title: string }> = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const rawCfi = (item as { cfi?: unknown }).cfi;
    const rawTitle = (item as { title?: unknown }).title;
    if (typeof rawCfi !== "string" || rawCfi.trim().length === 0) continue;
    out.push({
      cfi: rawCfi.trim(),
      title: typeof rawTitle === "string" && rawTitle.trim().length > 0 ? rawTitle.trim() : "Bookmark",
    });
  }
  return out;
}

function parseBookmarksJson(value: string | null): Array<{ cfi: string; title: string }> {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return normalizeBookmarks(parsed) || [];
  } catch {
    return [];
  }
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await ensureBooksSchema(env.SANCTUARY_DB);

  if (request.method === "GET") {
    const data = await env.SANCTUARY_DB
      .prepare(
        `SELECT id, title, author, cover_url, progress, total_pages, last_location, bookmarks_json, is_favorite, updated_at
         FROM books WHERE user_id = ? ORDER BY updated_at DESC`
      )
      .bind(userId)
      .all<BookRow>();

    const items = (data.results || []).map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      coverUrl: b.cover_url,
      progressPercent: Math.min(100, Math.round((Number(b.progress || 0) / Math.max(1, Number(b.total_pages || 100))) * 100)),
      lastLocation: b.last_location,
      bookmarks: parseBookmarksJson(b.bookmarks_json),
      status: Number(b.progress || 0) <= 0 ? "to-read" : Number(b.progress || 0) >= Number(b.total_pages || 100) ? "finished" : "reading",
      favorite: !!b.is_favorite,
      updatedAt: b.updated_at
    }));

    return new Response(JSON.stringify(items), { headers: { "Content-Type": "application/json" } });
  }

  if (request.method === "PATCH") {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });
    const body = (await request.json<LibraryPatchPayload>().catch(() => ({}))) as LibraryPatchPayload;

    const progress = toFiniteNumber(body.progress);
    const totalPagesRaw = toFiniteNumber(body.totalPages);
    const totalPages = totalPagesRaw === null ? null : Math.max(1, Math.round(totalPagesRaw));
    const favorite = body.favorite === undefined ? null : (body.favorite ? 1 : 0);
    const sanitizedProgress = progress === null ? null : clamp(Math.round(progress), 0, totalPages ?? 100);
    const lastLocation = typeof body.lastLocation === "string" && body.lastLocation.length > 0 ? body.lastLocation : null;
    const title = typeof body.title === "string" && body.title.trim().length > 0 ? body.title.trim() : null;
    const author = typeof body.author === "string" && body.author.trim().length > 0 ? body.author.trim() : null;
    const bookmarks = normalizeBookmarks(body.bookmarks);
    const bookmarksJson = bookmarks === null ? null : JSON.stringify(bookmarks);

    const updateResult = await env.SANCTUARY_DB
      .prepare(
        `UPDATE books SET
          progress = COALESCE(?, progress),
          total_pages = COALESCE(?, total_pages),
          last_location = COALESCE(?, last_location),
          bookmarks_json = COALESCE(?, bookmarks_json),
          is_favorite = COALESCE(?, is_favorite),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?`
      )
      .bind(
        sanitizedProgress,
        totalPages,
        lastLocation,
        bookmarksJson,
        favorite,
        id,
        userId
      )
      .run();

    const changes = Number(updateResult.meta?.changes || 0);
    if (changes === 0) {
      await env.SANCTUARY_DB
        .prepare(
          `INSERT INTO books (
            id, user_id, title, author, cover_url, progress, total_pages, last_location, bookmarks_json, is_favorite, updated_at
          ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        )
        .bind(
          id,
          userId,
          title || "Untitled",
          author || "Unknown",
          sanitizedProgress ?? 0,
          totalPages ?? 100,
          lastLocation,
          bookmarksJson ?? "[]",
          favorite ?? 0
        )
        .run();
    }

    return new Response(JSON.stringify({ success: true, upserted: changes === 0 }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405 });
};

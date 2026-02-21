import { getUserId } from "../../utils/auth";
import type { Env } from "../../types";
import { ensureBooksSchemaOnce } from "../../utils/schemaBootstrap";
import { jsonResponse, methodNotAllowed } from "./_shared/http";
import { clamp, toFiniteNumber } from "./_shared/validation";

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
  id?: string;
  title?: string;
  author?: string;
  coverUrl?: string;
  progress?: number;
  totalPages?: number;
  lastLocation?: string;
  favorite?: boolean;
  bookmarks?: Array<{ cfi: string; title: string }>;
}

function getBookContentKey(userId: string, bookId: string): string {
  return `users/${userId}/books/${bookId}.epub`;
}

function getBookCoverKey(userId: string, bookId: string): string {
  return `users/${userId}/books/${bookId}.cover`;
}

async function sha256Hex(input: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", input);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
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

type RequestContext = { request: Request; env: Env };

export const onRequest = async ({ request, env }: RequestContext): Promise<Response> => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await ensureBooksSchemaOnce(env.SANCTUARY_DB);

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

    return jsonResponse(items);
  }

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response("Expected multipart/form-data", { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const metadataRaw = formData.get("metadata");
    if (!file || typeof file !== "object" || typeof (file as { arrayBuffer?: unknown }).arrayBuffer !== "function") {
      return new Response("Missing file", { status: 400 });
    }
    if (typeof metadataRaw !== "string") {
      return new Response("Missing metadata", { status: 400 });
    }

    let body: LibraryPatchPayload;
    try {
      body = JSON.parse(metadataRaw) as LibraryPatchPayload;
    } catch {
      return new Response("Invalid metadata JSON", { status: 400 });
    }
    const id = typeof body.id === "string" && body.id.trim().length > 0 ? body.id.trim() : null;
    if (!id) return new Response("Missing id", { status: 400 });

    const progressRaw = toFiniteNumber(body.progress);
    const totalPagesRaw = toFiniteNumber(body.totalPages);
    const totalPages = totalPagesRaw === null ? 100 : Math.max(1, Math.round(totalPagesRaw));
    const progress = progressRaw === null ? 0 : clamp(Math.round(progressRaw), 0, totalPages);
    const favorite = body.favorite ? 1 : 0;
    const lastLocation = typeof body.lastLocation === "string" && body.lastLocation.length > 0 ? body.lastLocation : null;
    const title = typeof body.title === "string" && body.title.trim().length > 0 ? body.title.trim() : "Untitled";
    const author = typeof body.author === "string" && body.author.trim().length > 0 ? body.author.trim() : "Unknown";
    const bookmarks = normalizeBookmarks(body.bookmarks) || [];
    const bookmarksJson = JSON.stringify(bookmarks);
    const typedFile = file as File;
    const bytes = await typedFile.arrayBuffer();
    if (bytes.byteLength === 0) return new Response("Empty file", { status: 400 });
    const contentHash = await sha256Hex(bytes);
    const blobContentType = typedFile.type || "application/epub+zip";
    const contentKey = getBookContentKey(userId, id);
    const coverPart = formData.get("cover");
    let coverUrl: string | null = null;

    if (coverPart && typeof coverPart === "object" && typeof (coverPart as { arrayBuffer?: unknown }).arrayBuffer === "function") {
      const typedCover = coverPart as File;
      const coverBytes = await typedCover.arrayBuffer();
      if (coverBytes.byteLength > 0) {
        const coverType = typedCover.type || "image/jpeg";
        await env.SANCTUARY_BUCKET.put(getBookCoverKey(userId, id), coverBytes, {
          httpMetadata: { contentType: coverType },
        });
        coverUrl = `/api/content/${encodeURIComponent(id)}?asset=cover`;
      }
    }

    await env.SANCTUARY_BUCKET.put(contentKey, bytes, {
      httpMetadata: { contentType: blobContentType },
    });

    const duplicate = await env.SANCTUARY_DB
      .prepare("SELECT id FROM books WHERE user_id = ? AND content_hash = ? AND id != ? LIMIT 1")
      .bind(userId, contentHash, id)
      .first<{ id?: string }>();
    if (duplicate?.id) {
      return jsonResponse({ error: "Duplicate book upload is not allowed", existingId: duplicate.id }, { status: 409 });
    }

    const updateResult = await env.SANCTUARY_DB
      .prepare(
        `UPDATE books SET
          title = ?,
          author = ?,
          progress = ?,
          total_pages = ?,
          last_location = ?,
          bookmarks_json = ?,
          is_favorite = ?,
          cover_url = COALESCE(?, cover_url),
          content_hash = ?,
          content_blob = NULL,
          content_type = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?`
      )
      .bind(
        title,
        author,
        progress,
        totalPages,
        lastLocation,
        bookmarksJson,
        favorite,
        coverUrl,
        contentHash,
        blobContentType,
        id,
        userId
      )
      .run();

    const changes = Number(updateResult.meta?.changes || 0);
    if (changes === 0) {
      try {
        await env.SANCTUARY_DB
          .prepare(
            `INSERT INTO books (
              id, user_id, title, author, cover_url, content_hash, content_type,
              progress, total_pages, last_location, bookmarks_json, is_favorite, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
          )
          .bind(
            id,
            userId,
            title,
            author,
            coverUrl,
            contentHash,
            blobContentType,
            progress,
            totalPages,
            lastLocation,
            bookmarksJson,
            favorite
          )
          .run();
      } catch {
        return new Response("Book id conflict", { status: 409 });
      }
    }

    return jsonResponse({ success: true, upserted: changes === 0, coverUrl });
  }

  if (request.method === "PATCH") {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });
    const body = (await request.json().catch(() => ({}))) as LibraryPatchPayload;

    const progress = toFiniteNumber(body.progress);
    const totalPagesRaw = toFiniteNumber(body.totalPages);
    const totalPages = totalPagesRaw === null ? null : Math.max(1, Math.round(totalPagesRaw));
    const favorite = body.favorite === undefined ? null : (body.favorite ? 1 : 0);
    const sanitizedProgress = progress === null ? null : clamp(Math.round(progress), 0, totalPages ?? 100);
    const lastLocation = typeof body.lastLocation === "string" && body.lastLocation.length > 0 ? body.lastLocation : null;
    const title = typeof body.title === "string" && body.title.trim().length > 0 ? body.title.trim() : null;
    const author = typeof body.author === "string" && body.author.trim().length > 0 ? body.author.trim() : null;
    const coverUrl = typeof body.coverUrl === "string" && body.coverUrl.trim().length > 0 ? body.coverUrl.trim() : null;
    const bookmarks = normalizeBookmarks(body.bookmarks);
    const bookmarksJson = bookmarks === null ? null : JSON.stringify(bookmarks);

    const updateResult = await env.SANCTUARY_DB
      .prepare(
        `UPDATE books SET
          title = COALESCE(?, title),
          author = COALESCE(?, author),
          progress = COALESCE(?, progress),
          total_pages = COALESCE(?, total_pages),
          last_location = COALESCE(?, last_location),
          bookmarks_json = COALESCE(?, bookmarks_json),
          is_favorite = COALESCE(?, is_favorite),
          cover_url = COALESCE(?, cover_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?`
      )
      .bind(
        title,
        author,
        sanitizedProgress,
        totalPages,
        lastLocation,
        bookmarksJson,
        favorite,
        coverUrl,
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        )
        .bind(
          id,
          userId,
          title || "Untitled",
          author || "Unknown",
          coverUrl,
          sanitizedProgress ?? 0,
          totalPages ?? 100,
          lastLocation,
          bookmarksJson ?? "[]",
          favorite ?? 0
        )
        .run();
    }

    return jsonResponse({ success: true, upserted: changes === 0 });
  }

  if (request.method === "DELETE") {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });
    const contentKey = getBookContentKey(userId, id);
    const coverKey = getBookCoverKey(userId, id);

    const result = await env.SANCTUARY_DB
      .prepare("DELETE FROM books WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .run();
    await env.SANCTUARY_BUCKET.delete(contentKey);
    await env.SANCTUARY_BUCKET.delete(coverKey);

    return jsonResponse({
      success: true,
      deleted: Number(result.meta?.changes || 0) > 0
    });
  }

  return methodNotAllowed();
};

import { getUserId } from "../../utils/auth";
import type { Env } from "../../types";
import { ensureBooksSchema } from "../../utils/schemaBootstrap";
import { methodNotAllowed } from "../v2/_shared/http";

function badRequest(message: string): Response {
  return new Response(message, { status: 400 });
}

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

function getBookContentKey(userId: string, bookId: string): string {
  return `users/${userId}/books/${bookId}.epub`;
}

function getBookCoverKey(userId: string, bookId: string): string {
  return `users/${userId}/books/${bookId}.cover`;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await ensureBooksSchema(env.SANCTUARY_DB);

  const rawId = params.id;
  const id = typeof rawId === "string" ? rawId.trim() : "";
  if (!id) return badRequest("Missing id");
  const asset = new URL(request.url).searchParams.get("asset");
  const isCoverAsset = asset === "cover";
  const contentKey = getBookContentKey(userId, id);
  const coverKey = getBookCoverKey(userId, id);

  if (request.method === "GET") {
    const row = await env.SANCTUARY_DB
      .prepare("SELECT id, content_type, content_blob, cover_url FROM books WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .first<{ id?: string; content_type?: string | null; content_blob?: unknown; cover_url?: string | null }>();

    if (!row?.id) return notFound();

    if (isCoverAsset) {
      const coverObject = await env.SANCTUARY_BUCKET.get(coverKey);
      if (!coverObject) return notFound();
      const coverType = coverObject.httpMetadata?.contentType || "image/jpeg";
      return new Response(coverObject.body, {
        status: 200,
        headers: {
          "Content-Type": coverType,
          "Cache-Control": "private, max-age=300"
        }
      });
    }

    const object = await env.SANCTUARY_BUCKET.get(contentKey);
    if (!object) {
      if (!row.content_blob) return notFound();
      const contentType = row.content_type || "application/epub+zip";
      if (row.content_blob instanceof ArrayBuffer || ArrayBuffer.isView(row.content_blob)) {
        await env.SANCTUARY_BUCKET.put(contentKey, row.content_blob, {
          httpMetadata: { contentType },
        });
      }
      return new Response(row.content_blob as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=60"
        }
      });
    }

    const contentType = object.httpMetadata?.contentType || row.content_type || "application/epub+zip";
    return new Response(object.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60"
      }
    });
  }

  if (request.method === "PUT") {
    const contentType = request.headers.get("content-type") || (isCoverAsset ? "image/jpeg" : "application/epub+zip");
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength === 0) return badRequest("Empty content body");

    await env.SANCTUARY_BUCKET.put(isCoverAsset ? coverKey : contentKey, bytes, {
      httpMetadata: { contentType },
    });

    const coverUrl = `/api/content/${encodeURIComponent(id)}?asset=cover`;
    const result = isCoverAsset
      ? await env.SANCTUARY_DB
          .prepare(
            `UPDATE books SET cover_url = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`
          )
          .bind(coverUrl, id, userId)
          .run()
      : await env.SANCTUARY_DB
          .prepare(
            `UPDATE books SET content_blob = NULL, content_type = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`
          )
          .bind(contentType, id, userId)
          .run();

    if (Number(result.meta?.changes || 0) === 0) {
      if (isCoverAsset) {
        await env.SANCTUARY_DB
          .prepare(
            `INSERT INTO books (
              id, user_id, title, author, cover_url, progress, total_pages, bookmarks_json, is_favorite, updated_at
            ) VALUES (?, ?, 'Untitled', 'Unknown', ?, 0, 100, '[]', 0, CURRENT_TIMESTAMP)`
          )
          .bind(id, userId, coverUrl)
          .run();
      } else {
        await env.SANCTUARY_DB
          .prepare(
            `INSERT INTO books (
              id, user_id, title, author, content_type, progress, total_pages, bookmarks_json, is_favorite, updated_at
            ) VALUES (?, ?, 'Untitled', 'Unknown', ?, 0, 100, '[]', 0, CURRENT_TIMESTAMP)`
          )
          .bind(id, userId, contentType)
          .run();
      }
    }

    return new Response(JSON.stringify({ success: true, coverUrl: isCoverAsset ? coverUrl : undefined }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "DELETE") {
    await env.SANCTUARY_BUCKET.delete(isCoverAsset ? coverKey : contentKey);

    if (isCoverAsset) {
      await env.SANCTUARY_DB
        .prepare("UPDATE books SET cover_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?")
        .bind(id, userId)
        .run();
    } else {
      await env.SANCTUARY_DB
        .prepare("UPDATE books SET content_blob = NULL, content_type = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?")
        .bind(id, userId)
        .run();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  return methodNotAllowed();
};

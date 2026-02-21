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

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await ensureBooksSchema(env.SANCTUARY_DB);

  const rawId = params.id;
  const id = typeof rawId === "string" ? rawId.trim() : "";
  if (!id) return badRequest("Missing id");
  const contentKey = getBookContentKey(userId, id);

  if (request.method === "GET") {
    const row = await env.SANCTUARY_DB
      .prepare("SELECT id, content_type, content_blob FROM books WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .first<{ id?: string; content_type?: string | null; content_blob?: unknown }>();

    if (!row?.id) return notFound();

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
    const contentType = request.headers.get("content-type") || "application/epub+zip";
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength === 0) return badRequest("Empty content body");

    await env.SANCTUARY_BUCKET.put(contentKey, bytes, {
      httpMetadata: { contentType },
    });

    const result = await env.SANCTUARY_DB
      .prepare(
        `UPDATE books SET content_blob = NULL, content_type = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`
      )
      .bind(contentType, id, userId)
      .run();

    if (Number(result.meta?.changes || 0) === 0) {
      await env.SANCTUARY_DB
        .prepare(
          `INSERT INTO books (
            id, user_id, title, author, content_type, progress, total_pages, bookmarks_json, is_favorite, updated_at
          ) VALUES (?, ?, 'Untitled', 'Unknown', ?, 0, 100, '[]', 0, CURRENT_TIMESTAMP)`
        )
        .bind(id, userId, contentType)
        .run();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "DELETE") {
    await env.SANCTUARY_BUCKET.delete(contentKey);

    await env.SANCTUARY_DB
      .prepare("UPDATE books SET content_blob = NULL, content_type = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  return methodNotAllowed();
};

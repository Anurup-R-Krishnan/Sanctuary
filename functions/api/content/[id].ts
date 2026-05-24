import {
  contentKey,
  contentUrl,
  coverKey,
  errorJson,
  json,
  requireUser,
  type PagesContext,
} from "../_shared";
import { ensureBooksSchema } from "../../utils/schemaBootstrap";

export async function onRequestGet({ env, params, request }: PagesContext<{ id: string }>): Promise<Response> {
  return withContentContext(request, env, params as Record<string, string | string[]>, ({ id, user }) => handleGet(env, request, id, user));
}

export async function onRequestPut({ env, params, request }: PagesContext<{ id: string }>): Promise<Response> {
  return withContentContext(request, env, params as Record<string, string | string[]>, ({ id, user }) => handlePut(env, request, id, user));
}

async function handleGet(
  env: Parameters<typeof requireUser>[1],
  request: Request,
  id: string,
  user: string
): Promise<Response> {
  const url = new URL(request.url);
  const asset = url.searchParams.get("asset");

  if (asset === "cover") {
    const cover = await env.SANCTUARY_BUCKET.get(coverKey(user, id));
    if (!cover) return errorJson("Cover not found", 404);
    return new Response(cover.body, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": cover.httpMetadata?.contentType || "image/jpeg",
      },
    });
  }

  if (url.searchParams.get("download") !== "1") {
    return json({ url: `${contentUrl(id)}?download=1` });
  }

  const book = await env.SANCTUARY_BUCKET.get(contentKey(user, id));
  if (!book) return errorJson("Book content not found", 404);
  return new Response(book.body, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `attachment; filename="${id}.epub"`,
      "Content-Type": book.httpMetadata?.contentType || "application/epub+zip",
    },
  });
}

async function handlePut(
  env: Parameters<typeof requireUser>[1],
  request: Request,
  id: string,
  user: string
): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("asset") !== "cover") return errorJson("Unsupported content asset", 400);

  const contentType = request.headers.get("content-type") || "image/jpeg";
  await env.SANCTUARY_BUCKET.put(coverKey(user, id), request.body, {
    httpMetadata: { contentType },
  });

  const coverUrl = contentUrl(id, "cover");
  await ensureBooksSchema(env.SANCTUARY_DB);
  await env.SANCTUARY_DB.prepare("UPDATE books SET cover_url = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .bind(coverUrl, new Date().toISOString(), id, user)
    .run();

  return json({ success: true, coverUrl });
}

async function withContentContext(
  request: Request,
  env: Parameters<typeof requireUser>[1],
  params: Record<string, string | string[]>,
  handler: (context: { id: string; user: string }) => Promise<Response>
): Promise<Response> {
  const context = await authorizeContentRequest(request, env, params);
  return context instanceof Response ? context : handler(context);
}

async function authorizeContentRequest(
  request: Request,
  env: Parameters<typeof requireUser>[1],
  params: Record<string, string | string[]>
): Promise<Response | { id: string; user: string }> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;
  return { id: normalizeParam(params.id), user };
}

function normalizeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] || "" : value;
}

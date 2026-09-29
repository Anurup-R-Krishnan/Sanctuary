import { SECURITY_HEADERS, type PagesContext } from "../api/_shared";

export const MODEL_PREFIX = "models/";
const ALLOWED_MODELS = ["onnx-community/Kokoro-82M-v1.0-ONNX/"];
const SAFE_PATH = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;

const CONTENT_TYPES: Record<string, string> = {
  bin: "application/octet-stream",
  json: "application/json",
  onnx: "application/octet-stream",
  txt: "text/plain; charset=utf-8",
};

export function modelKeyFromPath(segments: string | string[] | undefined): string | null {
  const path = Array.isArray(segments) ? segments.join("/") : segments ?? "";
  if (!SAFE_PATH.test(path) || path.split("/").some((part) => part === "." || part === "..")) return null;
  if (!ALLOWED_MODELS.some((model) => path.startsWith(model))) return null;
  return `${MODEL_PREFIX}${path}`;
}

function notFound(): Response {
  return new Response("Not found", { headers: SECURITY_HEADERS, status: 404 });
}

async function serve({ env, params, request }: PagesContext<{ path: string }>, includeBody: boolean): Promise<Response> {
  const key = modelKeyFromPath((params as Record<string, string | string[]>).path);
  if (!key) return notFound();

  const object = includeBody
    ? await env.SANCTUARY_BUCKET.get(key, { onlyIf: request.headers, range: request.headers })
    : await env.SANCTUARY_BUCKET.head(key);
  if (!object) return notFound();

  const headers = new Headers(SECURITY_HEADERS);
  object.writeHttpMetadata(headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);
  const extension = key.split(".").pop() ?? "";
  if (!headers.has("Content-Type")) headers.set("Content-Type", CONTENT_TYPES[extension] ?? "application/octet-stream");

  const body = "body" in object ? (object as R2ObjectBody).body : null;
  if (!includeBody || !body) {
    headers.set("Content-Length", String(object.size));
    return new Response(null, { headers, status: includeBody ? 304 : 200 });
  }

  const range = object.range as { length?: number; offset?: number } | undefined;
  if (range && request.headers.has("range")) {
    const offset = range.offset ?? 0;
    const length = range.length ?? object.size - offset;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set("Content-Length", String(length));
    return new Response(body, { headers, status: 206 });
  }
  headers.set("Content-Length", String(object.size));
  return new Response(body, { headers, status: 200 });
}

export const onRequestGet = (context: PagesContext<{ path: string }>) => serve(context, true);
export const onRequestHead = (context: PagesContext<{ path: string }>) => serve(context, false);

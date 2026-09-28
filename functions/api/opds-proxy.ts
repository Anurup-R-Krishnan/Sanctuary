import { errorJson, handleOptions, requireUser, CORS_HEADERS, SECURITY_HEADERS, type PagesContext } from "./_shared";

export const onRequestOptions = () => handleOptions();

const FETCH_TIMEOUT_MS = 45_000;
// Matches MAX_EPUB_BYTES elsewhere — this route also proxies book downloads,
// not just small OPDS feed documents.
const MAX_RESPONSE_BYTES = 150 * 1024 * 1024;

const MAX_REDIRECTS = 5;

// Only feed, book and image types are passed through. Anything else (notably
// text/html or SVG) is relabelled so it can never render as a page on the app
// origin.
const ALLOWED_CONTENT_TYPE = /^(application\/(atom\+xml|xml|opds\+json|json|epub\+zip|pdf|octet-stream|x-mobipocket-ebook|vnd\.amazon\.ebook|x-fictionbook\+xml|fb2\+zip|x-mobi8-ebook|vnd\.comicbook\+zip|vnd\.comicbook-rar|x-cbz|x-cbr|opensearchdescription\+xml|zip)|text\/(xml|plain)|image\/(jpeg|png|gif|webp|avif))\b/i;

// Cloudflare Workers can't route to a caller's private LAN anyway, so this
// is defense-in-depth rather than the actual security boundary — it matters
// when the functions run under `wrangler pages dev` or in a container.
export function isBlockedHost(rawHostname: string): boolean {
  const lower = rawHostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  if (lower.endsWith(".local") || lower.endsWith(".internal")) return true;

  if (lower.includes(":")) {
    // IPv6 literal: loopback, unspecified, unique-local, link-local, and
    // IPv4-mapped/compatible forms (which smuggle any IPv4 address).
    return (
      lower === "::" ||
      lower === "::1" ||
      /^f[cd][0-9a-f]{2}:/.test(lower) ||
      /^fe[89ab][0-9a-f]:/.test(lower) ||
      lower.startsWith("::ffff:") ||
      /^::[0-9a-f]/.test(lower) || // IPv4-compatible (::a00:1 = 10.0.0.1)
      lower.startsWith("64:ff9b:") || // NAT64
      /^fe[c-f][0-9a-f]:/.test(lower) // site-local
    );
  }

  const ipv4 = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
  }
  return false;
}

function parseTargetUrl(raw: string | null, base?: string): URL | null {
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw, base);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (isBlockedHost(parsed.hostname)) return null;
  return parsed;
}

/** Errors the stream once more than `limit` bytes have passed through. */
function capBytes(body: ReadableStream<Uint8Array>, limit: number): ReadableStream<Uint8Array> {
  let seen = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > limit) {
          controller.error(new Error("Catalog response too large"));
          return;
        }
        controller.enqueue(chunk);
      },
    })
  );
}

// Proxies a GET to an arbitrary OPDS feed or acquisition (download) URL
// server-to-server, so the browser never has to satisfy the target server's
// own CORS policy. Most self-hosted OPDS servers — and some public ones —
// send no CORS headers at all, which otherwise blocks every fetch straight
// from the reader UI regardless of how permissive the server actually is
// about who may read its content.
export async function onRequestGet({ env, request }: PagesContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const url = new URL(request.url);
  const target = parseTargetUrl(url.searchParams.get("url"));
  if (!target) return errorJson("Missing or invalid target URL", 400);

  const targetAuth = request.headers.get("x-target-authorization");
  const targetAccept = request.headers.get("x-target-accept");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let upstream: Response;
  let current = target;
  try {
    // Redirects are followed by hand so every hop is re-validated against the
    // blocklist, and target credentials are dropped once the origin (scheme/host/port) changes.
    for (let hop = 0; ; hop++) {
      const sameOrigin = current.origin === target.origin;
      upstream = await fetch(current.toString(), {
        headers: {
          ...(targetAccept ? { Accept: targetAccept } : {}),
          ...(targetAuth && sameOrigin ? { Authorization: targetAuth } : {}),
        },
        redirect: "manual",
        signal: controller.signal,
      });
      if (upstream.status < 300 || upstream.status >= 400) break;
      const next = parseTargetUrl(upstream.headers.get("location"), current.toString());
      await upstream.body?.cancel();
      if (!next || hop >= MAX_REDIRECTS) return errorJson("Catalog redirect not allowed", 502);
      current = next;
    }
  } catch (err) {
    console.warn("[opds-proxy] Upstream fetch failed:", (err as Error)?.message);
    return errorJson("Could not reach the catalog server", 502);
  } finally {
    clearTimeout(timeout);
  }

  const contentLength = Number(upstream.headers.get("content-length") || "0");
  if (contentLength > MAX_RESPONSE_BYTES) {
    return errorJson("Catalog response too large", 502);
  }

  const contentDisposition = upstream.headers.get("content-disposition");
  const upstreamType = upstream.headers.get("content-type") ?? "";
  const contentType = ALLOWED_CONTENT_TYPE.test(upstreamType) ? upstreamType : "application/octet-stream";
  return new Response(upstream.body ? capBytes(upstream.body, MAX_RESPONSE_BYTES) : null, {
    headers: {
      ...CORS_HEADERS,
      ...SECURITY_HEADERS,
      // Content-Disposition (for download filenames) and X-Upstream-Url
      // (the URL after following redirects, needed to resolve relative
      // links inside a fetched OPDS feed) aren't on the CORS-safelisted
      // response-header list, so the client can't read them without this.
      "Access-Control-Expose-Headers": "Content-Disposition, X-Upstream-Url",
      "Cache-Control": "private, max-age=60",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Content-Type": contentType,
      "X-Upstream-Url": current.toString(),
      ...(contentDisposition ? { "Content-Disposition": contentDisposition } : {}),
    },
    status: upstream.status,
    statusText: upstream.statusText,
  });
}

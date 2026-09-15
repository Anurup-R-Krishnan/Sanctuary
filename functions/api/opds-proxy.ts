import { errorJson, handleOptions, requireUser, CORS_HEADERS, SECURITY_HEADERS, type PagesContext } from "./_shared";

export const onRequestOptions = () => handleOptions();

const FETCH_TIMEOUT_MS = 45_000;
// Matches MAX_EPUB_BYTES elsewhere — this route also proxies book downloads,
// not just small OPDS feed documents.
const MAX_RESPONSE_BYTES = 150 * 1024 * 1024;

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "::1"]);

// Cloudflare Workers can't route to a caller's private LAN anyway, so this
// is defense-in-depth rather than the actual security boundary — it mainly
// stops the proxy from being pointed at loopback/link-local/metadata-style
// addresses that might resolve to something on Cloudflare's own edge.
function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  if (lower.endsWith(".local") || lower.endsWith(".internal")) return true;

  const ipv4 = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

function parseTargetUrl(raw: string | null): URL | null {
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (isBlockedHost(parsed.hostname)) return null;
  return parsed;
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
  try {
    upstream = await fetch(target.toString(), {
      headers: {
        ...(targetAccept ? { Accept: targetAccept } : {}),
        ...(targetAuth ? { Authorization: targetAuth } : {}),
      },
      redirect: "follow",
      signal: controller.signal,
    });
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
  return new Response(upstream.body, {
    headers: {
      ...CORS_HEADERS,
      ...SECURITY_HEADERS,
      // Content-Disposition (for download filenames) and X-Upstream-Url
      // (the URL after following redirects, needed to resolve relative
      // links inside a fetched OPDS feed) aren't on the CORS-safelisted
      // response-header list, so the client can't read them without this.
      "Access-Control-Expose-Headers": "Content-Disposition, X-Upstream-Url",
      "Cache-Control": "private, max-age=60",
      "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
      "X-Upstream-Url": upstream.url,
      ...(contentDisposition ? { "Content-Disposition": contentDisposition } : {}),
    },
    status: upstream.status,
    statusText: upstream.statusText,
  });
}

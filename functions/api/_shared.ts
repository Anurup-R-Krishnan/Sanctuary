import type { Env } from "../types";

import { getUserId } from "../utils/auth";
import { getSchemaReady } from "../utils/schemaCache";

export type PagesContext<Params extends Record<string, string> = Record<string, string>> = EventContext<Env, string, Params>;

export interface BookmarkPayload {
  cfi: string;
  title?: string;
}

export interface BookRow {
  author: string;
  bookmarks_json: string;
  content_hash?: string | null;
  content_type: string | null;
  cover_url: string | null;
  id: string;
  is_favorite: number;
  last_location: string | null;
  progress: number;
  title: string;
  total_pages: number;
  updated_at: string;
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Target-Authorization, X-Target-Accept",
} as const;

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
} as const;

const BASE_HEADERS = { ...CORS_HEADERS, ...SECURITY_HEADERS };

export const handleOptions = () => new Response(null, { status: 204, headers: CORS_HEADERS });

export const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...BASE_HEADERS, ...init.headers },
  });

// The WebWorker lib's CacheStorage type shadows workers-types' `caches.default`.

export const errorJson = (message: string, status = 400) => json({ error: message }, { status });

export async function requireUser(request: Request, env: Env): Promise<string | Response> {
  // Session lookup needs the auth tables, so bootstrap before resolving the user.
  await getSchemaReady(env.SANCTUARY_DB);
  const userId = await getUserId(request, env);
  if (!userId) return errorJson("Unauthorized", 401);
  return userId;
}

export function parseJsonObject(input: string | null): Record<string, unknown> {
  if (!input) return {};
  try {
    const parsed = JSON.parse(input) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function normalizeBookmarks(value: unknown): BookmarkPayload[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): BookmarkPayload | null => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      if (typeof raw.cfi !== "string" || raw.cfi.length === 0) return null;
      return {
        cfi: raw.cfi,
        ...(typeof raw.title === "string" && raw.title.length > 0 ? { title: raw.title } : {}),
      };
    })
    .filter((item): item is BookmarkPayload => item !== null);
}

export function normalizeBookmarksJson(value: unknown): string {
  return JSON.stringify(normalizeBookmarks(value));
}

export function clampProgress(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function normalizeTotalPages(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 100;
  return Math.max(1, Math.round(n));
}

export function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function requiredText(value: unknown, fallback: string): string {
  return optionalText(value) || fallback;
}

export function contentKey(userId: string, bookId: string): string {
  return `users/${encodeURIComponent(userId)}/books/${encodeURIComponent(bookId)}/content.epub`;
}

export function coverKey(userId: string, bookId: string): string {
  return `users/${encodeURIComponent(userId)}/books/${encodeURIComponent(bookId)}/cover`;
}

export function contentUrl(bookId: string, asset?: "cover"): string {
  const base = `/api/content/${encodeURIComponent(bookId)}`;
  return asset ? `${base}?asset=${asset}` : base;
}

export function toLibraryItem(row: BookRow) {
  const progressPercent = clampProgress(row.progress);
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    coverUrl: row.cover_url || "",
    progressPercent,
    totalPages: normalizeTotalPages(row.total_pages),
    lastLocation: row.last_location || "",
    bookmarks: normalizeBookmarks(parseJsonArray(row.bookmarks_json)),
    favorite: !!row.is_favorite,
    status: progressPercent <= 0 ? "to-read" : progressPercent >= 100 ? "finished" : "reading",
    updatedAt: row.updated_at,
    format: formatForContentType(row.content_type),
    contentHash: row.content_hash || undefined,
  };
}

const FORMAT_BY_CONTENT_TYPE: Record<string, string> = {
  "application/epub+zip": "epub",
  "application/pdf": "pdf",
  "application/vnd.amazon.ebook": "azw3",
  "application/vnd.comicbook+zip": "cbz",
  "application/x-fictionbook+xml": "fb2",
  "application/x-mobipocket-ebook": "mobi",
  "application/x-zip-compressed-fb2": "fb2",
  "text/html": "html",
  "text/markdown": "markdown",
  "text/plain": "txt",
};

export function formatForContentType(contentType: string | null | undefined): string {
  const type = (contentType ?? "").split(";")[0]!.trim().toLowerCase();
  return FORMAT_BY_CONTENT_TYPE[type] ?? "epub";
}

function parseJsonArray(input: string): unknown {
  try {
    const parsed = JSON.parse(input) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// EPUB magic bytes: PK\x03\x04 (ZIP)
export async function isValidEpub(file: File): Promise<boolean> {
  const slice = file.slice(0, 4);
  const buf = await slice.arrayBuffer();
  const bytes = new Uint8Array(buf);
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

export async function isValidBookFile(file: File): Promise<boolean> {
  const slice = file.slice(0, 1024);
  const buf = await slice.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (bytes.length === 0) return false;

  // 1. ZIP header: PK\x03\x04, PK\x05\x06, PK\x07\x08 (EPUB, FBZ)
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08))
  ) {
    return true;
  }

  // 2. MOBI / AZW / PalmDOC header (magic BOOKMOBI at byte 60)
  if (bytes.length >= 68) {
    const magic = String.fromCharCode(...bytes.slice(60, 68));
    if (magic === "BOOKMOBI") return true;
  }

  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return true;

  // 3. FB2 XML or HTML document
  try {
    const snippet = new TextDecoder().decode(bytes).trimStart().toLowerCase();
    if (snippet.includes("<fictionbook")) return true;
    const markup = snippet.replace(/^\ufeff/, "").replace(/^<\?xml[^>]*\?>\s*/, "");
    if (markup.startsWith("<!doctype html") || markup.startsWith("<html")) return true;
  } catch {
    // ignore
  }

  // 4. File extension detection for plain text / markdown / azw / mobi / fb2
  const name = file.name ? file.name.toLowerCase() : "";
  if (
    name.endsWith(".txt") ||
    name.endsWith(".text") ||
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    name.endsWith(".mobi") ||
    name.endsWith(".azw") ||
    name.endsWith(".azw3") ||
    name.endsWith(".fb2") ||
    name.endsWith(".html") ||
    name.endsWith(".xhtml") ||
    name.endsWith(".htm") ||
    name.endsWith(".pdf") ||
    name.endsWith(".prc")
  ) {
    return true;
  }

  return false;
}

const CONTENT_TYPE_BY_EXTENSION: Array<[RegExp, string]> = [
  [/\.epub$/, "application/epub+zip"],
  [/\.pdf$/, "application/pdf"],
  [/\.cbz$/, "application/vnd.comicbook+zip"],
  [/\.(mobi|prc)$/, "application/x-mobipocket-ebook"],
  [/\.(azw|azw3|kf8)$/, "application/vnd.amazon.ebook"],
  [/\.(fbz|fb2\.zip)$/, "application/x-zip-compressed-fb2"],
  [/\.fb2$/, "application/x-fictionbook+xml"],
  [/\.(txt|text)$/, "text/plain"],
  [/\.(md|markdown)$/, "text/markdown"],
  [/\.(html|htm|xhtml)$/, "text/html"],
];

export function resolveBookContentType(file: File): string {
  const name = file.name ? file.name.toLowerCase() : "";
  for (const [pattern, type] of CONTENT_TYPE_BY_EXTENSION) {
    if (pattern.test(name)) return type;
  }
  const declared = (file.type || "").split(";")[0]!.trim().toLowerCase();
  if (declared in FORMAT_BY_CONTENT_TYPE) return declared;
  return "application/epub+zip";
}

export const MAX_EPUB_BYTES = 150 * 1024 * 1024; // 150 MB

// --- Edge Caching ---


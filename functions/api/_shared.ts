import type { Env } from "../types";

import { getUserId } from "../utils/auth";

export type PagesContext<Params extends Record<string, string> = Record<string, string>> = EventContext<Env, string, Params>;

export interface BookmarkPayload {
  cfi: string;
  title?: string;
}

export interface BookRow {
  author: string;
  bookmarks_json: string;
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
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
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

export const errorJson = (message: string, status = 400) => json({ error: message }, { status });

export async function requireUser(request: Request, env: Env): Promise<string | Response> {
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
  };
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

export const MAX_EPUB_BYTES = 150 * 1024 * 1024; // 150 MB

// --- Edge Caching ---
export async function withEdgeCache(
  request: Request,
  cacheKeyModifier: string,
  fetcher: () => Promise<Response>
): Promise<Response> {
  const cache = caches.default;
  const url = new URL(request.url);
  url.searchParams.set("_cache", cacheKeyModifier);
  
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  
  if (cached) {
    const res = new Response(cached.body, cached);
    res.headers.set("X-Cache-Status", "HIT");
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  }

  const response = await fetcher();
  
  if (response.status === 200) {
    const responseToCache = new Response(response.clone().body, response);
    responseToCache.headers.set("Cache-Control", "s-maxage=3600"); 
    await cache.put(cacheKey, responseToCache);
  }

  const res = new Response(response.body, response);
  res.headers.set("X-Cache-Status", "MISS");
  return res;
}

export async function purgeEdgeCache(request: Request, cacheKeyModifier: string): Promise<void> {
  const cache = caches.default;
  const url = new URL(request.url);
  url.search = ""; // Strip query params to purge base route
  url.searchParams.set("_cache", cacheKeyModifier);
  const cacheKey = new Request(url.toString(), { method: "GET" });
  await cache.delete(cacheKey);
}


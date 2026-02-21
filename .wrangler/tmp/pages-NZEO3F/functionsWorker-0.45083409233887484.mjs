var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-Pnd8L3/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// utils/auth.ts
async function getUserId(request, env) {
  const authDisabled = env.DISABLE_CLERK_AUTH === "true";
  if (authDisabled) return "guest-user";
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  return `clerk:${token.slice(0, 16)}`;
}
__name(getUserId, "getUserId");

// api/v2/me.ts
var onRequestGet = /* @__PURE__ */ __name(async ({ request, env }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const mode = userId.startsWith("guest") ? "guest" : "clerk";
  return new Response(JSON.stringify({ userId, mode }), {
    headers: { "Content-Type": "application/json" }
  });
}, "onRequestGet");

// utils/dbSchema.ts
async function hasColumn(db, table, column) {
  const result = await db.prepare(`PRAGMA table_info(${table})`).all();
  const rows = result.results || [];
  return rows.some((r) => r.name === column);
}
__name(hasColumn, "hasColumn");

// utils/schemaBootstrap.ts
async function ensureSettingsSchema(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      daily_goal INTEGER NOT NULL DEFAULT 30,
      weekly_goal INTEGER NOT NULL DEFAULT 150,
      theme_preset TEXT NOT NULL DEFAULT 'paper',
      font_scale INTEGER NOT NULL DEFAULT 100,
      line_height REAL NOT NULL DEFAULT 1.6,
      text_width INTEGER NOT NULL DEFAULT 70,
      motion TEXT NOT NULL DEFAULT 'full',
      tap_zones INTEGER NOT NULL DEFAULT 1,
      swipe_nav INTEGER NOT NULL DEFAULT 1,
      auto_hide_ms INTEGER NOT NULL DEFAULT 4500,
      show_progress INTEGER NOT NULL DEFAULT 1,
      show_page_meta INTEGER NOT NULL DEFAULT 1,
      accent TEXT NOT NULL DEFAULT '#B37A4C'
    )`
  ).run();
}
__name(ensureSettingsSchema, "ensureSettingsSchema");
async function ensureSessionsSchema(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS reading_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_sec INTEGER NOT NULL DEFAULT 0,
      pages_advanced INTEGER NOT NULL DEFAULT 0,
      device TEXT NOT NULL DEFAULT 'web'
    )`
  ).run();
}
__name(ensureSessionsSchema, "ensureSessionsSchema");
async function ensureBooksSchema(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      cover_url TEXT,
      content_blob BLOB,
      content_type TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      total_pages INTEGER NOT NULL DEFAULT 100,
      last_location TEXT,
      bookmarks_json TEXT NOT NULL DEFAULT '[]',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();
  const hasBookmarksJson = await hasColumn(db, "books", "bookmarks_json");
  if (!hasBookmarksJson) {
    await db.prepare(`ALTER TABLE books ADD COLUMN bookmarks_json TEXT NOT NULL DEFAULT '[]'`).run();
  }
  const hasContentBlob = await hasColumn(db, "books", "content_blob");
  if (!hasContentBlob) {
    await db.prepare(`ALTER TABLE books ADD COLUMN content_blob BLOB`).run();
  }
  const hasContentType = await hasColumn(db, "books", "content_type");
  if (!hasContentType) {
    await db.prepare(`ALTER TABLE books ADD COLUMN content_type TEXT`).run();
  }
}
__name(ensureBooksSchema, "ensureBooksSchema");

// api/v2/_shared/http.ts
function jsonResponse(payload, init) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers || {}
    }
  });
}
__name(jsonResponse, "jsonResponse");
function methodNotAllowed() {
  return new Response("Method not allowed", { status: 405 });
}
__name(methodNotAllowed, "methodNotAllowed");

// api/v2/_shared/settings.ts
var readerSettingsDefaults = {
  dailyGoal: 30,
  weeklyGoal: 150,
  themePreset: "paper",
  fontScale: 100,
  lineHeight: 1.6,
  textWidth: 70,
  motion: "full",
  tapZones: true,
  swipeNav: true,
  autoHideMs: 4500,
  showProgress: true,
  showPageMeta: true,
  accent: "#B37A4C"
};

// api/v2/goals.ts
function startOfUtcDay(input) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0));
}
__name(startOfUtcDay, "startOfUtcDay");
function startOfUtcWeek(input) {
  const day = input.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate() + mondayOffset, 0, 0, 0, 0));
}
__name(startOfUtcWeek, "startOfUtcWeek");
function isoDateOnly(value) {
  return value.toISOString().slice(0, 10);
}
__name(isoDateOnly, "isoDateOnly");
function clampPercent(total, target) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(total / target * 100)));
}
__name(clampPercent, "clampPercent");
async function sumDurationSec(db, userId, startIso, endIso) {
  const row = await db.prepare(
    `SELECT COALESCE(SUM(duration_sec), 0) AS total_sec
       FROM reading_sessions
       WHERE user_id = ? AND started_at >= ? AND started_at < ?`
  ).bind(userId, startIso, endIso).first();
  return Math.max(0, Number(row?.total_sec || 0));
}
__name(sumDurationSec, "sumDurationSec");
var onRequest = /* @__PURE__ */ __name(async ({ request, env }) => {
  if (request.method !== "GET") return methodNotAllowed();
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  await ensureSessionsSchema(env.SANCTUARY_DB);
  await ensureSettingsSchema(env.SANCTUARY_DB);
  const now = /* @__PURE__ */ new Date();
  const dayStart = startOfUtcDay(now);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1e3);
  const weekStart = startOfUtcWeek(now);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1e3);
  const [dayTotalSec, weekTotalSec, settings] = await Promise.all([
    sumDurationSec(env.SANCTUARY_DB, userId, dayStart.toISOString(), dayEnd.toISOString()),
    sumDurationSec(env.SANCTUARY_DB, userId, weekStart.toISOString(), weekEnd.toISOString()),
    env.SANCTUARY_DB.prepare("SELECT daily_goal, weekly_goal FROM user_settings WHERE user_id = ?").bind(userId).first()
  ]);
  const dailyTarget = Math.max(1, Number(settings?.daily_goal || readerSettingsDefaults.dailyGoal));
  const weeklyTarget = Math.max(1, Number(settings?.weekly_goal || readerSettingsDefaults.weeklyGoal));
  const dayMinutes = Math.round(dayTotalSec / 60);
  const weekMinutes = Math.round(weekTotalSec / 60);
  return jsonResponse({
    day: {
      date: isoDateOnly(dayStart),
      totalMinutes: dayMinutes,
      targetMinutes: dailyTarget,
      progressPercent: clampPercent(dayMinutes, dailyTarget)
    },
    week: {
      startDate: isoDateOnly(weekStart),
      endDate: isoDateOnly(new Date(weekEnd.getTime() - 1)),
      totalMinutes: weekMinutes,
      targetMinutes: weeklyTarget,
      progressPercent: clampPercent(weekMinutes, weeklyTarget)
    }
  });
}, "onRequest");

// api/v2/_shared/validation.ts
function toFiniteNumber(value) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}
__name(toFiniteNumber, "toFiniteNumber");
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
__name(clamp, "clamp");
function toIntWithin(value, fallback, min, max) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}
__name(toIntWithin, "toIntWithin");

// api/v2/library.ts
function normalizeBookmarks(input) {
  if (!Array.isArray(input)) return null;
  const out = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const rawCfi = item.cfi;
    const rawTitle = item.title;
    if (typeof rawCfi !== "string" || rawCfi.trim().length === 0) continue;
    out.push({
      cfi: rawCfi.trim(),
      title: typeof rawTitle === "string" && rawTitle.trim().length > 0 ? rawTitle.trim() : "Bookmark"
    });
  }
  return out;
}
__name(normalizeBookmarks, "normalizeBookmarks");
function parseBookmarksJson(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return normalizeBookmarks(parsed) || [];
  } catch {
    return [];
  }
}
__name(parseBookmarksJson, "parseBookmarksJson");
var onRequest2 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  await ensureBooksSchema(env.SANCTUARY_DB);
  if (request.method === "GET") {
    const data = await env.SANCTUARY_DB.prepare(
      `SELECT id, title, author, cover_url, progress, total_pages, last_location, bookmarks_json, is_favorite, updated_at
         FROM books WHERE user_id = ? ORDER BY updated_at DESC`
    ).bind(userId).all();
    const items = (data.results || []).map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      coverUrl: b.cover_url,
      progressPercent: Math.min(100, Math.round(Number(b.progress || 0) / Math.max(1, Number(b.total_pages || 100)) * 100)),
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
    if (!(file instanceof File)) {
      return new Response("Missing file", { status: 400 });
    }
    if (typeof metadataRaw !== "string") {
      return new Response("Missing metadata", { status: 400 });
    }
    const body = JSON.parse(metadataRaw);
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
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength === 0) return new Response("Empty file", { status: 400 });
    const blobContentType = file.type || "application/epub+zip";
    const updateResult = await env.SANCTUARY_DB.prepare(
      `UPDATE books SET
          title = ?,
          author = ?,
          progress = ?,
          total_pages = ?,
          last_location = ?,
          bookmarks_json = ?,
          is_favorite = ?,
          content_blob = ?,
          content_type = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?`
    ).bind(
      title,
      author,
      progress,
      totalPages,
      lastLocation,
      bookmarksJson,
      favorite,
      bytes,
      blobContentType,
      id,
      userId
    ).run();
    const changes = Number(updateResult.meta?.changes || 0);
    if (changes === 0) {
      try {
        await env.SANCTUARY_DB.prepare(
          `INSERT INTO books (
              id, user_id, title, author, cover_url, content_blob, content_type,
              progress, total_pages, last_location, bookmarks_json, is_favorite, updated_at
            ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        ).bind(
          id,
          userId,
          title,
          author,
          bytes,
          blobContentType,
          progress,
          totalPages,
          lastLocation,
          bookmarksJson,
          favorite
        ).run();
      } catch {
        return new Response("Book id conflict", { status: 409 });
      }
    }
    return jsonResponse({ success: true, upserted: changes === 0 });
  }
  if (request.method === "PATCH") {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });
    const body = await request.json().catch(() => ({}));
    const progress = toFiniteNumber(body.progress);
    const totalPagesRaw = toFiniteNumber(body.totalPages);
    const totalPages = totalPagesRaw === null ? null : Math.max(1, Math.round(totalPagesRaw));
    const favorite = body.favorite === void 0 ? null : body.favorite ? 1 : 0;
    const sanitizedProgress = progress === null ? null : clamp(Math.round(progress), 0, totalPages ?? 100);
    const lastLocation = typeof body.lastLocation === "string" && body.lastLocation.length > 0 ? body.lastLocation : null;
    const title = typeof body.title === "string" && body.title.trim().length > 0 ? body.title.trim() : null;
    const author = typeof body.author === "string" && body.author.trim().length > 0 ? body.author.trim() : null;
    const bookmarks = normalizeBookmarks(body.bookmarks);
    const bookmarksJson = bookmarks === null ? null : JSON.stringify(bookmarks);
    const updateResult = await env.SANCTUARY_DB.prepare(
      `UPDATE books SET
          title = COALESCE(?, title),
          author = COALESCE(?, author),
          progress = COALESCE(?, progress),
          total_pages = COALESCE(?, total_pages),
          last_location = COALESCE(?, last_location),
          bookmarks_json = COALESCE(?, bookmarks_json),
          is_favorite = COALESCE(?, is_favorite),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?`
    ).bind(
      title,
      author,
      sanitizedProgress,
      totalPages,
      lastLocation,
      bookmarksJson,
      favorite,
      id,
      userId
    ).run();
    const changes = Number(updateResult.meta?.changes || 0);
    if (changes === 0) {
      await env.SANCTUARY_DB.prepare(
        `INSERT INTO books (
            id, user_id, title, author, cover_url, progress, total_pages, last_location, bookmarks_json, is_favorite, updated_at
          ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      ).bind(
        id,
        userId,
        title || "Untitled",
        author || "Unknown",
        sanitizedProgress ?? 0,
        totalPages ?? 100,
        lastLocation,
        bookmarksJson ?? "[]",
        favorite ?? 0
      ).run();
    }
    return jsonResponse({ success: true, upserted: changes === 0 });
  }
  if (request.method === "DELETE") {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });
    const result = await env.SANCTUARY_DB.prepare("DELETE FROM books WHERE id = ? AND user_id = ?").bind(id, userId).run();
    return jsonResponse({
      success: true,
      deleted: Number(result.meta?.changes || 0) > 0
    });
  }
  return methodNotAllowed();
}, "onRequest");

// api/v2/sessions.ts
function toIsoDateOrNull(value) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
__name(toIsoDateOrNull, "toIsoDateOrNull");
function toFinite(value, fallback) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
__name(toFinite, "toFinite");
var onRequest3 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  await ensureSessionsSchema(env.SANCTUARY_DB);
  if (request.method === "GET") {
    const data = await env.SANCTUARY_DB.prepare("SELECT * FROM reading_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 200").bind(userId).all();
    const items = (data.results || []).map((row) => ({
      id: row.id,
      bookId: row.book_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationSec: row.duration_sec,
      pagesAdvanced: row.pages_advanced,
      device: row.device
    }));
    return jsonResponse(items);
  }
  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (typeof body.bookId !== "string" || body.bookId.trim().length === 0) {
      return new Response("Invalid bookId", { status: 400 });
    }
    const id = typeof body.id === "string" && body.id.trim().length > 0 ? body.id.trim() : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const startedAt = toIsoDateOrNull(body.startedAt) || (/* @__PURE__ */ new Date()).toISOString();
    const endedAt = body.endedAt === null ? null : toIsoDateOrNull(body.endedAt);
    const durationSec = Math.max(0, Math.round(toFinite(body.durationSec, 0)));
    const pagesAdvanced = Math.max(0, Math.round(toFinite(body.pagesAdvanced, 0)));
    const device = body.device === "android" || body.device === "desktop" || body.device === "web" ? body.device : "web";
    await env.SANCTUARY_DB.prepare(
      `INSERT OR REPLACE INTO reading_sessions (
          id, user_id, book_id, started_at, ended_at, duration_sec, pages_advanced, device
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      userId,
      body.bookId.trim(),
      startedAt,
      endedAt,
      durationSec,
      pagesAdvanced,
      device
    ).run();
    return jsonResponse({ success: true });
  }
  return methodNotAllowed();
}, "onRequest");

// api/v2/settings.ts
var onRequest4 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  await ensureSettingsSchema(env.SANCTUARY_DB);
  if (request.method === "GET") {
    const row = await env.SANCTUARY_DB.prepare("SELECT * FROM user_settings WHERE user_id = ?").bind(userId).first();
    if (!row) {
      return jsonResponse(readerSettingsDefaults);
    }
    return jsonResponse({
      dailyGoal: row.daily_goal ?? readerSettingsDefaults.dailyGoal,
      weeklyGoal: row.weekly_goal ?? readerSettingsDefaults.weeklyGoal,
      themePreset: row.theme_preset,
      fontScale: row.font_scale,
      lineHeight: row.line_height,
      textWidth: row.text_width,
      motion: row.motion,
      tapZones: !!row.tap_zones,
      swipeNav: !!row.swipe_nav,
      autoHideMs: row.auto_hide_ms,
      showProgress: !!row.show_progress,
      showPageMeta: !!row.show_page_meta,
      accent: row.accent
    });
  }
  if (request.method === "PUT") {
    const body = await request.json().catch(() => ({}));
    const payload = {
      ...readerSettingsDefaults,
      ...body,
      dailyGoal: toIntWithin(body.dailyGoal, readerSettingsDefaults.dailyGoal, 1, 1200),
      weeklyGoal: toIntWithin(body.weeklyGoal, readerSettingsDefaults.weeklyGoal, 1, 5e3),
      tapZones: body.tapZones === void 0 ? readerSettingsDefaults.tapZones : !!body.tapZones,
      swipeNav: body.swipeNav === void 0 ? readerSettingsDefaults.swipeNav : !!body.swipeNav,
      showProgress: body.showProgress === void 0 ? readerSettingsDefaults.showProgress : !!body.showProgress,
      showPageMeta: body.showPageMeta === void 0 ? readerSettingsDefaults.showPageMeta : !!body.showPageMeta
    };
    await env.SANCTUARY_DB.prepare(
      `INSERT OR REPLACE INTO user_settings (
          user_id, daily_goal, weekly_goal, theme_preset, font_scale, line_height,
          text_width, motion, tap_zones, swipe_nav, auto_hide_ms, show_progress,
          show_page_meta, accent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      userId,
      payload.dailyGoal,
      payload.weeklyGoal,
      payload.themePreset,
      payload.fontScale,
      payload.lineHeight,
      payload.textWidth,
      payload.motion,
      payload.tapZones ? 1 : 0,
      payload.swipeNav ? 1 : 0,
      payload.autoHideMs,
      payload.showProgress ? 1 : 0,
      payload.showPageMeta ? 1 : 0,
      payload.accent
    ).run();
    return jsonResponse({ success: true });
  }
  return methodNotAllowed();
}, "onRequest");

// api/content/[id].ts
function badRequest(message) {
  return new Response(message, { status: 400 });
}
__name(badRequest, "badRequest");
function notFound() {
  return new Response("Not found", { status: 404 });
}
__name(notFound, "notFound");
var onRequest5 = /* @__PURE__ */ __name(async ({ request, env, params }) => {
  const userId = await getUserId(request, env);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  await ensureBooksSchema(env.SANCTUARY_DB);
  const rawId = params.id;
  const id = typeof rawId === "string" ? rawId.trim() : "";
  if (!id) return badRequest("Missing id");
  if (request.method === "GET") {
    const row = await env.SANCTUARY_DB.prepare("SELECT content_blob, content_type FROM books WHERE id = ? AND user_id = ?").bind(id, userId).first();
    if (!row?.content_blob) return notFound();
    const contentType = row.content_type || "application/epub+zip";
    return new Response(row.content_blob, {
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
    const result = await env.SANCTUARY_DB.prepare(
      `UPDATE books SET content_blob = ?, content_type = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`
    ).bind(bytes, contentType, id, userId).run();
    if (Number(result.meta?.changes || 0) === 0) {
      await env.SANCTUARY_DB.prepare(
        `INSERT INTO books (
            id, user_id, title, author, content_blob, content_type, progress, total_pages, bookmarks_json, is_favorite, updated_at
          ) VALUES (?, ?, 'Untitled', 'Unknown', ?, ?, 0, 100, '[]', 0, CURRENT_TIMESTAMP)`
      ).bind(id, userId, bytes, contentType).run();
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "DELETE") {
    await env.SANCTUARY_DB.prepare("UPDATE books SET content_blob = NULL, content_type = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").bind(id, userId).run();
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
  return methodNotAllowed();
}, "onRequest");

// ../.wrangler/tmp/pages-NZEO3F/functionsRoutes-0.12162365711069045.mjs
var routes = [
  {
    routePath: "/api/v2/me",
    mountPath: "/api/v2",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/v2/goals",
    mountPath: "/api/v2",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/v2/library",
    mountPath: "/api/v2",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/v2/sessions",
    mountPath: "/api/v2",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/v2/settings",
    mountPath: "/api/v2",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  },
  {
    routePath: "/api/content/:id",
    mountPath: "/api/content",
    method: "",
    middlewares: [],
    modules: [onRequest5]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-Pnd8L3/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-Pnd8L3/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.45083409233887484.mjs.map

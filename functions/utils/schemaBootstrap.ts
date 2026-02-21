import { getTableInfo, hasColumn, listColumns } from "./dbSchema";

export async function ensureSettingsSchema(db: D1Database): Promise<void> {
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

  const requiredColumns: Array<{ name: string; sql: string }> = [
    { name: "daily_goal", sql: "ALTER TABLE user_settings ADD COLUMN daily_goal INTEGER NOT NULL DEFAULT 30" },
    { name: "weekly_goal", sql: "ALTER TABLE user_settings ADD COLUMN weekly_goal INTEGER NOT NULL DEFAULT 150" },
    { name: "theme_preset", sql: "ALTER TABLE user_settings ADD COLUMN theme_preset TEXT NOT NULL DEFAULT 'paper'" },
    { name: "font_scale", sql: "ALTER TABLE user_settings ADD COLUMN font_scale INTEGER NOT NULL DEFAULT 100" },
    { name: "line_height", sql: "ALTER TABLE user_settings ADD COLUMN line_height REAL NOT NULL DEFAULT 1.6" },
    { name: "text_width", sql: "ALTER TABLE user_settings ADD COLUMN text_width INTEGER NOT NULL DEFAULT 70" },
    { name: "motion", sql: "ALTER TABLE user_settings ADD COLUMN motion TEXT NOT NULL DEFAULT 'full'" },
    { name: "tap_zones", sql: "ALTER TABLE user_settings ADD COLUMN tap_zones INTEGER NOT NULL DEFAULT 1" },
    { name: "swipe_nav", sql: "ALTER TABLE user_settings ADD COLUMN swipe_nav INTEGER NOT NULL DEFAULT 1" },
    { name: "auto_hide_ms", sql: "ALTER TABLE user_settings ADD COLUMN auto_hide_ms INTEGER NOT NULL DEFAULT 4500" },
    { name: "show_progress", sql: "ALTER TABLE user_settings ADD COLUMN show_progress INTEGER NOT NULL DEFAULT 1" },
    { name: "show_page_meta", sql: "ALTER TABLE user_settings ADD COLUMN show_page_meta INTEGER NOT NULL DEFAULT 1" },
    { name: "accent", sql: "ALTER TABLE user_settings ADD COLUMN accent TEXT NOT NULL DEFAULT '#B37A4C'" }
  ];

  for (const column of requiredColumns) {
    const exists = await hasColumn(db, "user_settings", column.name);
    if (!exists) {
      await db.prepare(column.sql).run();
    }
  }
}

export async function ensureSessionsSchema(db: D1Database): Promise<void> {
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

export async function ensureBooksSchema(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      cover_url TEXT,
      content_hash TEXT,
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

  const requiredColumns: Array<{ name: string; sql: string }> = [
    { name: "id", sql: "ALTER TABLE books ADD COLUMN id TEXT" },
    { name: "user_id", sql: "ALTER TABLE books ADD COLUMN user_id TEXT NOT NULL DEFAULT ''" },
    { name: "title", sql: "ALTER TABLE books ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled'" },
    { name: "author", sql: "ALTER TABLE books ADD COLUMN author TEXT NOT NULL DEFAULT 'Unknown'" },
    { name: "cover_url", sql: "ALTER TABLE books ADD COLUMN cover_url TEXT" },
    { name: "content_hash", sql: "ALTER TABLE books ADD COLUMN content_hash TEXT" },
    { name: "content_blob", sql: "ALTER TABLE books ADD COLUMN content_blob BLOB" },
    { name: "content_type", sql: "ALTER TABLE books ADD COLUMN content_type TEXT" },
    { name: "progress", sql: "ALTER TABLE books ADD COLUMN progress INTEGER NOT NULL DEFAULT 0" },
    { name: "total_pages", sql: "ALTER TABLE books ADD COLUMN total_pages INTEGER NOT NULL DEFAULT 100" },
    { name: "last_location", sql: "ALTER TABLE books ADD COLUMN last_location TEXT" },
    { name: "bookmarks_json", sql: "ALTER TABLE books ADD COLUMN bookmarks_json TEXT NOT NULL DEFAULT '[]'" },
    { name: "is_favorite", sql: "ALTER TABLE books ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0" },
    { name: "updated_at", sql: "ALTER TABLE books ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP" },
  ];

  const existingColumns = new Set(await listColumns(db, "books"));
  for (const column of requiredColumns) {
    if (!existingColumns.has(column.name)) {
      await db.prepare(column.sql).run();
    }
  }

  const tableInfo = await getTableInfo(db, "books");
  const idColumn = tableInfo.find((c) => c.name === "id");
  const needsCanonicalRebuild = !idColumn || Number(idColumn.pk || 0) !== 1;

  if (needsCanonicalRebuild) {
    await rebuildBooksTableCanonical(db);
  }

  const hasBooksUserIdIdx = await hasColumn(db, "books", "user_id");
  if (hasBooksUserIdIdx) {
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_books_user_updated ON books(user_id, updated_at DESC)").run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_books_user_content_hash ON books(user_id, content_hash)").run();
  }
}

function createFallbackId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `book-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toNonEmptyText(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function toOptionalText(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

function toInteger(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

function normalizeBookmarksJson(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) return "[]";
  try {
    const parsed = JSON.parse(value) as unknown;
    return JSON.stringify(Array.isArray(parsed) ? parsed : []);
  } catch {
    return "[]";
  }
}

async function rebuildBooksTableCanonical(db: D1Database): Promise<void> {
  await db.prepare("DROP TABLE IF EXISTS books__canonical").run();
  await db.prepare(
    `CREATE TABLE books__canonical (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      cover_url TEXT,
      content_hash TEXT,
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

  const rowsResult = await db.prepare("SELECT * FROM books").all<Record<string, unknown>>();
  const rows = rowsResult.results || [];
  const seenIds = new Set<string>();

  for (const row of rows) {
    const rawId = toNonEmptyText(row.id, createFallbackId());
    let id = rawId;
    let suffix = 1;
    while (seenIds.has(id)) {
      suffix += 1;
      id = `${rawId}-${suffix}`;
    }
    seenIds.add(id);

    const totalPages = Math.max(1, toInteger(row.total_pages, 100));
    const progress = Math.max(0, Math.min(totalPages, toInteger(row.progress, 0)));
    const isFavorite = toInteger(row.is_favorite, 0) ? 1 : 0;

    await db.prepare(
      `INSERT INTO books__canonical (
        id, user_id, title, author, cover_url, content_hash, content_blob, content_type,
        progress, total_pages, last_location, bookmarks_json, is_favorite, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        toNonEmptyText(row.user_id, ""),
        toNonEmptyText(row.title, "Untitled"),
        toNonEmptyText(row.author, "Unknown"),
        toOptionalText(row.cover_url),
        toOptionalText(row.content_hash),
        row.content_blob ?? null,
        toOptionalText(row.content_type),
        progress,
        totalPages,
        toOptionalText(row.last_location),
        normalizeBookmarksJson(row.bookmarks_json),
        isFavorite,
        toNonEmptyText(row.updated_at, new Date().toISOString())
      )
      .run();
  }

  await db.prepare("DROP TABLE books").run();
  await db.prepare("ALTER TABLE books__canonical RENAME TO books").run();
}

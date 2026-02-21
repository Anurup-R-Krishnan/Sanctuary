import { getTableInfo, listColumns } from "./dbSchema";

type ColumnSpec = { name: string; sql: string };

let booksSchemaReady: Promise<void> | null = null;

async function ensureTable(db: D1Database, createSql: string): Promise<void> {
  await db.prepare(createSql).run();
}

async function ensureColumns(db: D1Database, table: string, columns: ColumnSpec[]): Promise<void> {
  const existing = new Set(await listColumns(db, table));
  for (const column of columns) {
    if (!existing.has(column.name)) {
      await db.prepare(column.sql).run();
    }
  }
}

async function hasPrimaryKeyColumn(db: D1Database, table: string, columnName: string): Promise<boolean> {
  const tableInfo = await getTableInfo(db, table);
  const column = tableInfo.find((c) => c.name === columnName);
  return !!column && Number(column.pk || 0) === 1;
}

const SETTINGS_COLUMNS: ColumnSpec[] = [
  { name: "user_id", sql: "ALTER TABLE user_settings ADD COLUMN user_id TEXT NOT NULL DEFAULT ''" },
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

const SESSION_COLUMNS: ColumnSpec[] = [
  { name: "id", sql: "ALTER TABLE reading_sessions ADD COLUMN id TEXT" },
  { name: "user_id", sql: "ALTER TABLE reading_sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT ''" },
  { name: "book_id", sql: "ALTER TABLE reading_sessions ADD COLUMN book_id TEXT NOT NULL DEFAULT ''" },
  { name: "started_at", sql: "ALTER TABLE reading_sessions ADD COLUMN started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP" },
  { name: "ended_at", sql: "ALTER TABLE reading_sessions ADD COLUMN ended_at TEXT" },
  { name: "duration_sec", sql: "ALTER TABLE reading_sessions ADD COLUMN duration_sec INTEGER NOT NULL DEFAULT 0" },
  { name: "pages_advanced", sql: "ALTER TABLE reading_sessions ADD COLUMN pages_advanced INTEGER NOT NULL DEFAULT 0" },
  { name: "device", sql: "ALTER TABLE reading_sessions ADD COLUMN device TEXT NOT NULL DEFAULT 'web'" },
];

const BOOK_COLUMNS: ColumnSpec[] = [
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

export async function ensureSettingsSchema(db: D1Database): Promise<void> {
  await ensureTable(db,
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
  );
  await ensureColumns(db, "user_settings", SETTINGS_COLUMNS);
  if (!(await hasPrimaryKeyColumn(db, "user_settings", "user_id"))) {
    await rebuildUserSettingsCanonical(db);
  }
}

export async function ensureSessionsSchema(db: D1Database): Promise<void> {
  await ensureTable(db,
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
  );
  await ensureColumns(db, "reading_sessions", SESSION_COLUMNS);
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON reading_sessions(user_id, started_at DESC)").run();
}

export async function ensureBooksSchema(db: D1Database): Promise<void> {
  await ensureTable(db,
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
  );
  await ensureColumns(db, "books", BOOK_COLUMNS);
  if (!(await hasPrimaryKeyColumn(db, "books", "id"))) {
    await rebuildBooksTableCanonical(db);
  }

  await db.prepare("CREATE INDEX IF NOT EXISTS idx_books_user_updated ON books(user_id, updated_at DESC)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_books_user_content_hash ON books(user_id, content_hash)").run();
}

export async function ensureBooksSchemaOnce(db: D1Database): Promise<void> {
  if (booksSchemaReady) {
    await booksSchemaReady;
    return;
  }

  booksSchemaReady = ensureBooksSchema(db).catch((error) => {
    booksSchemaReady = null;
    throw error;
  });
  await booksSchemaReady;
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

async function rebuildUserSettingsCanonical(db: D1Database): Promise<void> {
  await db.prepare("DROP TABLE IF EXISTS user_settings__canonical").run();
  await db.prepare(
    `CREATE TABLE user_settings__canonical (
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

  const rowsResult = await db.prepare("SELECT * FROM user_settings").all<Record<string, unknown>>();
  const rows = rowsResult.results || [];
  const seenUserIds = new Set<string>();

  for (const row of rows) {
    const rawUserId = toNonEmptyText(row.user_id, "guest-user");
    let userId = rawUserId;
    let suffix = 1;
    while (seenUserIds.has(userId)) {
      suffix += 1;
      userId = `${rawUserId}-${suffix}`;
    }
    seenUserIds.add(userId);

    await db.prepare(
      `INSERT INTO user_settings__canonical (
        user_id, daily_goal, weekly_goal, theme_preset, font_scale, line_height, text_width,
        motion, tap_zones, swipe_nav, auto_hide_ms, show_progress, show_page_meta, accent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        userId,
        Math.max(1, toInteger(row.daily_goal, 30)),
        Math.max(1, toInteger(row.weekly_goal, 150)),
        toNonEmptyText(row.theme_preset, "paper"),
        Math.max(50, toInteger(row.font_scale, 100)),
        Number.isFinite(Number(row.line_height)) ? Number(row.line_height) : 1.6,
        Math.max(40, toInteger(row.text_width, 70)),
        toNonEmptyText(row.motion, "full"),
        toInteger(row.tap_zones, 1) ? 1 : 0,
        toInteger(row.swipe_nav, 1) ? 1 : 0,
        Math.max(0, toInteger(row.auto_hide_ms, 4500)),
        toInteger(row.show_progress, 1) ? 1 : 0,
        toInteger(row.show_page_meta, 1) ? 1 : 0,
        toNonEmptyText(row.accent, "#B37A4C")
      )
      .run();
  }

  await db.prepare("DROP TABLE user_settings").run();
  await db.prepare("ALTER TABLE user_settings__canonical RENAME TO user_settings").run();
}

import { hasColumn } from "./dbSchema";

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

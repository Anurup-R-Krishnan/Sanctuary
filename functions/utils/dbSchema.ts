export async function hasColumn(db: D1Database, table: string, column: string): Promise<boolean> {
  const result = await db.prepare(`PRAGMA table_info(${table})`).all();
  const rows = (result.results || []) as Array<{ name?: string }>;
  return rows.some((r) => r.name === column);
}

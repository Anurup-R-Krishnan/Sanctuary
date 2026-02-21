export async function hasColumn(db: D1Database, table: string, column: string): Promise<boolean> {
  const result = await db.prepare(`PRAGMA table_info(${table})`).all();
  const rows = (result.results || []) as Array<{ name?: string }>;
  return rows.some((r) => r.name === column);
}

export async function listColumns(db: D1Database, table: string): Promise<string[]> {
  const result = await db.prepare(`PRAGMA table_info(${table})`).all();
  const rows = (result.results || []) as Array<{ name?: string }>;
  return rows
    .map((row) => (typeof row.name === "string" ? row.name : ""))
    .filter((name) => name.length > 0);
}

export interface TableColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

export async function getTableInfo(db: D1Database, table: string): Promise<TableColumnInfo[]> {
  const result = await db.prepare(`PRAGMA table_info(${table})`).all<TableColumnInfo>();
  return (result.results || []).filter(
    (row): row is TableColumnInfo => !!row && typeof row.name === "string" && row.name.length > 0
  );
}

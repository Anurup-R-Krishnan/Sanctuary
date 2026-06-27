import { ensureBooksSchema, ensureSessionsSchema, ensureSettingsSchema } from "./schemaBootstrap";

// Module-level cache — runs once per isolate lifetime, not per request.
let schemaReady: Promise<void> | null = null;

export function getSchemaReady(db: D1Database): Promise<void> {
  if (!schemaReady) {
    schemaReady = Promise.all([
      ensureBooksSchema(db),
      ensureSettingsSchema(db),
      ensureSessionsSchema(db),
    ]).then(() => undefined).catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

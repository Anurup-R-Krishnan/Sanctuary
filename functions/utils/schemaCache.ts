import { ensureAnnotationsSchema, ensureBooksSchema, ensureSessionsSchema, ensureSettingsSchema } from "./schemaBootstrap";

let schemaReady: Promise<void> | null = null;

export function getSchemaReady(db: D1Database): Promise<void> {
  if (!schemaReady) {
    schemaReady = Promise.all([
      ensureBooksSchema(db),
      ensureSettingsSchema(db),
      ensureSessionsSchema(db),
      ensureAnnotationsSchema(db),
    ]).then(() => undefined).catch((err) => {
      // Reset cache so a transient failure (e.g. Worker isolate restart mid-migration)
      // can be retried on the next request instead of locking the isolate into a
      // permanent failure state.
      schemaReady = null;
      console.error("[schema] Bootstrap failed, will retry on next request:", err);
      throw err;
    });
  }
  return schemaReady;
}

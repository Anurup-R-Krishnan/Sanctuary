export interface Env {
  SANCTUARY_DB: D1Database;
  SANCTUARY_BUCKET: R2Bucket;
  CLERK_SECRET_KEY?: string;
}

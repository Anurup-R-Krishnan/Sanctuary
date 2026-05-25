export interface Env {
  CLERK_SECRET_KEY?: string;
  DISABLE_CLERK_AUTH?: string;
  SANCTUARY_BUCKET: R2Bucket;
  SANCTUARY_DB: D1Database;
}

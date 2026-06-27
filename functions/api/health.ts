import { json, type PagesContext } from "./_shared";

export async function onRequestGet({ env }: PagesContext): Promise<Response> {
  let dbOk = false;
  try {
    const result = await env.SANCTUARY_DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
    dbOk = result?.ok === 1;
  } catch (err) {
    console.error("Health check DB error:", err);
  }

  let r2Ok = false;
  try {
    await env.SANCTUARY_BUCKET.head("health-check-nonexistent");
    r2Ok = true; 
  } catch (err) {
    console.error("Health check R2 error:", err);
  }

  return json({
    ok: dbOk && r2Ok,
    db: dbOk,
    r2: r2Ok,
    ts: new Date().toISOString(),
  }, { status: dbOk && r2Ok ? 200 : 503 });
}

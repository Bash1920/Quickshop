import { databaseReadiness } from "@/db/readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  try {
    const status = await databaseReadiness();
    // Always return 200 when the database is reachable so platform
    // healthchecks pass. Clients must inspect checks.schema: "ready" means
    // all QuickShop tables exist, "not_initialized" means run migrations.
    return Response.json(
      {
        ok: true,
        checks: { database: "connected", schema: status.ready ? "ready" : "not_initialized" },
        ...(status.ready ? {} : { missing: status.missing }),
      },
      { status: 200, headers }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const hint = message.includes("DATABASE_URL is not set")
      ? "Add DATABASE_URL in Vercel → Settings → Environment Variables, then redeploy."
      : undefined;
    return Response.json(
      { ok: false, checks: { database: "unavailable" }, ...(hint ? { hint } : {}) },
      { status: 503, headers }
    );
  }
}

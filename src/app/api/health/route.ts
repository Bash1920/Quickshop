import { databaseReadiness } from "@/db/readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  try {
    const status = await databaseReadiness();
    return Response.json(
      { ok: status.ready, checks: { database: "connected", schema: status.ready ? "ready" : "not_initialized" } },
      { status: status.ready ? 200 : 503, headers },
    );
  } catch {
    return Response.json({ ok: false, checks: { database: "unavailable" } }, { status: 503, headers });
  }
}

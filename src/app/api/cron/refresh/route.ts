import { connection, NextRequest, NextResponse } from "next/server";
import { REFRESH_DEFS, recordOutcome, recordRefresh } from "@/lib/health";

// Automated refresh — warms the data caches for every page so the site serves
// fresh data without anyone doing anything manually. Called by Vercel Cron
// every 30 minutes (see vercel.json) and manually when needed.
//
// Protection: requires the CRON_SECRET env var (set it in the Vercel
// dashboard). Vercel's cron invocations send it automatically as
// `Authorization: Bearer <CRON_SECRET>`; a manual call can pass
// `?key=<CRON_SECRET>` instead. If the env var is not set, this endpoint
// refuses (503) rather than running unprotected. The secret is never logged.
//
// The run is bounded: sequential steps with a small delay between them (no
// parallel flood of any source), an overall 55s deadline, and anything still
// pending when the deadline hits is reported as skipped.

export const maxDuration = 60;

const STEP_DELAY_MS = 400;
const OVERALL_DEADLINE_MS = 55_000;

export async function GET(request: NextRequest) {
  // Opt into dynamic rendering (segment `dynamic` config is banned under
  // cacheComponents in this Next.js version).
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "cron_not_configured", message: "CRON_SECRET is not set on this deployment." },
      { status: 503 }
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const authed = auth === `Bearer ${secret}` || (key !== "" && key === secret);
  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const deadline = Date.now() + OVERALL_DEADLINE_MS;
  const results: { id: string; ok: boolean; count: number | null; ms: number; error?: string }[] = [];
  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const def of REFRESH_DEFS) {
    if (Date.now() >= deadline) {
      skipped++;
      results.push({ id: def.id, ok: false, count: null, ms: 0, error: "skipped (deadline)" });
      continue;
    }
    const t0 = Date.now();
    try {
      const count = await def.run();
      const ms = Date.now() - t0;
      ok++;
      results.push({ id: def.id, ok: true, count, ms });
      recordOutcome(def.id, { ok: true, count, latencyMs: ms });
    } catch (e) {
      const ms = Date.now() - t0;
      const msg = e instanceof Error ? e.message : "fetch failed";
      failed++;
      results.push({ id: def.id, ok: false, count: null, ms, error: msg.slice(0, 120) });
      recordOutcome(def.id, { ok: false, latencyMs: ms, error: msg.slice(0, 120) });
    }
    // Small delay between sources — never hammer an upstream.
    const remaining = deadline - Date.now();
    if (remaining > STEP_DELAY_MS) {
      await new Promise((r) => setTimeout(r, STEP_DELAY_MS));
    }
  }

  const finishedAt = new Date().toISOString();
  const run = {
    startedAt,
    finishedAt,
    durationMs: Date.now() - new Date(startedAt).getTime(),
    ok,
    failed,
    skipped,
    results,
  };
  recordRefresh(run);
  return NextResponse.json(run);
}

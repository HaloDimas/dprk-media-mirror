import Link from "next/link";
import { connection } from "next/server";
import { getStatusSnapshot, type SourceStatus } from "@/lib/health";

// Live-probes every source on each visit, so this page renders at request
// time like Home/News/Schedule (instant = false allows the blocking render).
export const instant = false;

const BADGE: Record<SourceStatus, string> = {
  live: "bg-emerald-900/60 text-emerald-300 border border-emerald-700",
  degraded: "bg-amber-900/60 text-amber-300 border border-amber-700",
  down: "bg-red-900/60 text-red-300 border border-red-700",
  unknown: "bg-zinc-800 text-zinc-400 border border-zinc-700",
};

const LABEL: Record<SourceStatus, string> = {
  live: "Live",
  degraded: "Degraded",
  down: "Down",
  unknown: "Unknown",
};

/** Status dot colours (the dot is a CSS span, never a text glyph). */
const DOT: Record<SourceStatus, string> = {
  live: "bg-emerald-300",
  degraded: "bg-amber-300",
  down: "bg-red-300",
  unknown: "border border-zinc-400 bg-transparent",
};

function timeAgo(iso: string | null, now: number): string {
  if (!iso) return "—";
  const diff = Math.max(0, now - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ago`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

/** Absolute time in WIB (UTC+7), the timezone the mirror's audience reads. */
function fmtTimeWib(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  return d.toISOString().replace("T", " ").slice(0, 19) + " WIB";
}

export default async function StatusPage() {
  // Opt into dynamic rendering (segment `dynamic` config is banned under
  // cacheComponents in this Next.js version).
  await connection();
  const snapshot = await getStatusSnapshot();
  const now = Date.now();
  const counts = { live: 0, degraded: 0, down: 0, unknown: 0 } as Record<SourceStatus, number>;
  for (const s of snapshot.sources) counts[s.status]++;
  const groups = ["Koryo Front", "KCNA Watch", "DPRK sites (.kp)", "Cloudflare Workers"];

  // Last automated refresh: the Cloudflare Worker's KV record is the source
  // of truth (it survives Vercel redeploys); the in-memory run recorded by
  // this server instance is only a fallback when the Worker has no record.
  const workerRefresh = snapshot.workerLastRefresh;
  const refresh = workerRefresh
    ? {
        at: workerRefresh.at,
        ok: workerRefresh.ok,
        failed: workerRefresh.failed,
        skipped: workerRefresh.skipped,
        durationMs: workerRefresh.durationMs,
      }
    : snapshot.lastRefresh
      ? {
          at: snapshot.lastRefresh.startedAt,
          ok: snapshot.lastRefresh.ok,
          failed: snapshot.lastRefresh.failed,
          skipped: snapshot.lastRefresh.skipped,
          durationMs: snapshot.lastRefresh.durationMs,
        }
      : null;
  const refreshAgeMs = refresh ? now - new Date(refresh.at).getTime() : null;
  const refreshStale = refreshAgeMs !== null && refreshAgeMs > 60 * 60 * 1000;
  const nextRunIso = refresh
    ? new Date(new Date(refresh.at).getTime() + 30 * 60 * 1000).toISOString()
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">System Status</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Live health of every crawler and scraper this mirror depends on. Checked{" "}
        {fmtTime(snapshot.checkedAt)} — probes run live on each visit (cached 60s), with an
        8-second cap per source, so a slow source never blocks this page.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["live", "text-emerald-300"],
            ["degraded", "text-amber-300"],
            ["down", "text-red-300"],
            ["unknown", "text-zinc-400"],
          ] as [SourceStatus, string][]
        ).map(([k, cls]) => (
          <div key={k} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className={`text-3xl font-bold ${cls}`}>{counts[k]}</div>
            <div className="mt-1 text-sm capitalize text-zinc-400">{k} sources</div>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="font-semibold text-white">Automated refresh</h2>
        {refresh ? (
          <div className="mt-2 text-sm text-zinc-300">
            <p>
              Last automated refresh: <span className="text-zinc-100">{fmtTimeWib(refresh.at)}</span> (
              {timeAgo(refresh.at, now)}) —{" "}
              {refresh.ok !== null ? (
                <>
                  <span className="text-emerald-300">{refresh.ok} ok</span>,{" "}
                  <span className="text-red-300">{refresh.failed} failed</span>
                  {refresh.skipped !== null && refresh.skipped > 0 && (
                    <>, <span className="text-amber-300">{refresh.skipped} skipped</span></>
                  )}{" "}
                  in {refresh.durationMs !== null ? `${(refresh.durationMs / 1000).toFixed(1)}s` : "—"}.
                </>
              ) : (
                "the run finished but its result could not be read."
              )}
            </p>
            <p className="mt-1 text-zinc-400">
              Next run expected around {fmtTimeWib(nextRunIso)} — the refresh runs automatically
              every 30 minutes (Cloudflare Worker calls /api/cron/refresh) and warms the caches
              for every page, so data stays fresh with no manual work.
            </p>
            {refreshStale && (
              <p className="mt-2 rounded-lg border border-amber-800 bg-amber-950/60 px-3 py-2 text-amber-200">
                Last refresh was more than an hour ago — the schedule may be stalled. Check the
                Cloudflare Worker (sweet-bird-3c29) triggers and that its CRON_SECRET matches the
                one in Vercel.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">
            Automated refresh is configured (Cloudflare Worker, every 30 minutes). No run recorded
            yet — the first run happens within 30 minutes. It needs the same CRON_SECRET secret in
            the Vercel dashboard and in the Cloudflare Worker.
          </p>
        )}
      </section>

      {groups.map((group) => {
        const rows = snapshot.sources.filter((s) => s.group === group);
        if (!rows.length) return null;
        return (
          <section key={group} className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-white">{group}</h2>
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900 text-zinc-400">
                    <th className="px-4 py-2 font-medium">Source</th>
                    <th className="px-4 py-2 font-medium">Provides</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Last success</th>
                    <th className="px-4 py-2 font-medium">Items</th>
                    <th className="px-4 py-2 font-medium">Latency</th>
                    <th className="px-4 py-2 font-medium">Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-900/60">
                      <td className="px-4 py-2 font-medium text-zinc-100">{s.name}</td>
                      <td className="px-4 py-2 text-zinc-400">{s.provides}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[s.status]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${DOT[s.status]}`} aria-hidden="true" />
                          {LABEL[s.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-zinc-300" title={fmtTime(s.lastOk)}>
                        {s.lastOk ? timeAgo(s.lastOk, now) : "never"}
                      </td>
                      <td className="px-4 py-2 text-zinc-300">{s.lastCount ?? "—"}</td>
                      <td className="px-4 py-2 text-zinc-300">
                        {s.latencyMs != null ? `${(s.latencyMs / 1000).toFixed(1)}s` : "—"}
                      </td>
                      <td className="max-w-56 truncate px-4 py-2 text-red-300" title={s.lastError ?? ""}>
                        {s.lastError ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
        <h2 className="font-semibold text-white">How this works</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Every source is probed live when this page loads (8s cap each, all in parallel, result
            cached 60s). A source that returns data is Live; one that returns nothing is Degraded;
            one that errors is Down; one that cannot be checked (e.g. the KCNA Watch session is not
            configured) is Unknown.
          </li>
          <li>
            The automated refresh (
            <code className="rounded bg-zinc-800 px-1 text-zinc-200">/api/cron/refresh</code>)
            runs every 30 minutes, triggered by the Cloudflare cron Worker, and re-fetches every
            source in turn, so pages serve fresh data. It is protected by a secret and never
            hammers a source (sequential requests, short delays, 55s overall cap). The last-run
            readout above comes from the Worker&apos;s own record, so it survives redeploys —
            the per-source last-success history on this page is per server instance only.
          </li>
          <li>
            This server is stateless, so the recorded history on this page only covers what this
            server instance has seen — the live probe above is the authoritative check. See{" "}
            <Link href="/sources" className="text-red-400 hover:underline">
              Mirrored Sources
            </Link>{" "}
            for what each source provides.
          </li>
        </ul>
      </section>
    </div>
  );
}

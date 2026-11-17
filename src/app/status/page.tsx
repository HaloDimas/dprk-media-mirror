import { connection } from "next/server";
import { getStatusSnapshot, type SourceStatus } from "@/lib/health";
import StatusHow from "@/components/StatusHow";
import { T, TimeAgo } from "@/i18n/T";

// Live-probes every source on each visit, so this page renders at request
// time like Home/News/Schedule (instant = false allows the blocking render).
export const instant = false;

const BADGE: Record<SourceStatus, string> = {
  live: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700",
  degraded: "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700",
  down: "bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700",
  unknown: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700",
};

const LABEL_KEY: Record<SourceStatus, string> = {
  live: "status.live",
  degraded: "status.degraded",
  down: "status.down",
  unknown: "status.unknown",
};

/** Status dot colours (the dot is a CSS span, never a text glyph). */
const DOT: Record<SourceStatus, string> = {
  live: "bg-emerald-500 dark:bg-emerald-300",
  degraded: "bg-amber-500 dark:bg-amber-300",
  down: "bg-red-500 dark:bg-red-300",
  unknown: "border border-zinc-400 bg-transparent",
};

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
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
        <T k="status.title" />
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        <T k="status.intro" values={{ time: fmtTime(snapshot.checkedAt) }} />
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["live", "status.liveSources", "text-emerald-700 dark:text-emerald-300"],
            ["degraded", "status.degradedSources", "text-amber-700 dark:text-amber-300"],
            ["down", "status.downSources", "text-red-700 dark:text-red-300"],
            ["unknown", "status.unknownSources", "text-zinc-600 dark:text-zinc-400"],
          ] as [SourceStatus, string, string][]
        ).map(([k, labelKey, cls]) => (
          <div key={k} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4">
            <div className={`text-3xl font-bold ${cls}`}>{counts[k]}</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              <T k={labelKey} />
            </div>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4">
        <h2 className="font-semibold text-zinc-900 dark:text-white">
          <T k="status.automatedRefresh" />
        </h2>
        {refresh ? (
          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              <T k="status.lastRefresh" />{" "}
              <span className="text-zinc-900 dark:text-zinc-100">{fmtTimeWib(refresh.at)}</span> (
              <TimeAgo iso={refresh.at} now={now} />) —{" "}
              {refresh.ok !== null ? (
                <>
                  <span className="text-emerald-700 dark:text-emerald-300">
                    {refresh.ok} <T k="status.ok" />
                  </span>
                  ,{" "}
                  <span className="text-red-700 dark:text-red-300">
                    {refresh.failed} <T k="status.failed" />
                  </span>
                  {refresh.skipped !== null && refresh.skipped > 0 && (
                    <>
                      ,{" "}
                      <span className="text-amber-700 dark:text-amber-300">
                        {refresh.skipped} <T k="status.skipped" />
                      </span>
                    </>
                  )}{" "}
                  {refresh.durationMs !== null ? (
                    <T k="status.inSeconds" values={{ n: (refresh.durationMs / 1000).toFixed(1) }} />
                  ) : (
                    "—"
                  )}
                  .
                </>
              ) : (
                <T k="status.runFinished" />
              )}
            </p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              <T k="status.nextRun" values={{ time: fmtTimeWib(nextRunIso) }} />
            </p>
            {refreshStale && (
              <p className="mt-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-100 dark:bg-amber-950/60 px-3 py-2 text-amber-800 dark:text-amber-200">
                <T k="status.staleWarning" />
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            <T k="status.configuredNoRun" />
          </p>
        )}
      </section>

      {groups.map((group) => {
        const rows = snapshot.sources.filter((s) => s.group === group);
        if (!rows.length) return null;
        return (
          <section key={group} className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white">{group}</h2>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
                    <th className="px-4 py-2 font-medium">
                      <T k="status.tableSource" />
                    </th>
                    <th className="px-4 py-2 font-medium">
                      <T k="status.tableProvides" />
                    </th>
                    <th className="px-4 py-2 font-medium">
                      <T k="status.tableStatus" />
                    </th>
                    <th className="px-4 py-2 font-medium">
                      <T k="status.tableLastSuccess" />
                    </th>
                    <th className="px-4 py-2 font-medium">
                      <T k="status.tableItems" />
                    </th>
                    <th className="px-4 py-2 font-medium">
                      <T k="status.tableLatency" />
                    </th>
                    <th className="px-4 py-2 font-medium">
                      <T k="status.tableLastError" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b border-zinc-200/60 dark:border-zinc-800/60 last:border-0 hover:bg-white/60 dark:hover:bg-zinc-900/60">
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">{s.name}</td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{s.provides}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[s.status]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${DOT[s.status]}`} aria-hidden="true" />
                          <T k={LABEL_KEY[s.status]} />
                        </span>
                      </td>
                      <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300" title={fmtTime(s.lastOk)}>
                        {s.lastOk ? <TimeAgo iso={s.lastOk} now={now} /> : <T k="status.never" />}
                      </td>
                      <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{s.lastCount ?? "—"}</td>
                      <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                        {s.latencyMs != null ? `${(s.latencyMs / 1000).toFixed(1)}s` : "—"}
                      </td>
                      <td className="max-w-56 truncate px-4 py-2 text-red-700 dark:text-red-300" title={s.lastError ?? ""}>
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

      <StatusHow />
    </div>
  );
}

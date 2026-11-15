// Crawler/scraper health tracking for the /status page and the automated
// refresh endpoint (/api/cron/refresh).
//
// Vercel serverless instances are stateless and short-lived, so this store is
// deliberately in-memory: it records the last outcome of every source probe
// and the last automated refresh run on THIS instance. The /status page also
// live-probes every source when it is requested (cached 60s), so the page
// stays accurate even on a fresh instance that has no recorded history yet.
// Nothing here contains or logs a credential.

import {
  getEpg,
  getKcnaNews,
  getKcnaWatchArticleBody,
  getKcnaWatchNews,
  getKcnwLatest,
  getKcnwSearch,
  getKnsNews,
  getKorarchNews,
  getMinjuNews,
  getNaenaraNews,
  getPeriodicals,
  getPublications,
  getPyongyangTimesNews,
  getRecordings,
  getRodongNews,
  getRyugyongNews,
  getStamps,
  getVokNews,
  getYouthNews,
} from "./sources";

export type SourceStatus = "live" | "degraded" | "down" | "unknown";

export interface SourceHealth {
  id: string;
  name: string;
  provides: string;
  group: string;
  status: SourceStatus;
  /** ISO timestamp of the last successful fetch, or null if never. */
  lastOk: string | null;
  /** Short last error message, or null. */
  lastError: string | null;
  /** Item count returned on the last fetch, or null. */
  lastCount: number | null;
  /** Latency of the last probe in ms, or null. */
  latencyMs: number | null;
  /** ISO timestamp of the last probe, or null. */
  lastChecked: string | null;
}

export interface RefreshRun {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  ok: number;
  failed: number;
  skipped: number;
  results: { id: string; ok: boolean; count: number | null; ms: number; error?: string }[];
}

export interface StatusSnapshot {
  checkedAt: string;
  sources: SourceHealth[];
  lastRefresh: RefreshRun | null;
}

// ---------------------------------------------------------------- Store
const healthMap = new Map<string, Omit<SourceHealth, "id" | "name" | "provides" | "group">>();
let lastRefresh: RefreshRun | null = null;

export function recordOutcome(
  id: string,
  result: { ok: boolean; count?: number | null; latencyMs?: number | null; error?: string | null }
): void {
  const prev = healthMap.get(id);
  const now = new Date().toISOString();
  healthMap.set(id, {
    status: result.ok ? (result.count === 0 ? "degraded" : "live") : result.error === "not_configured" ? "unknown" : "down",
    lastOk: result.ok ? now : prev?.lastOk ?? null,
    lastError: result.ok ? null : result.error ?? "fetch failed",
    lastCount: result.count ?? prev?.lastCount ?? null,
    latencyMs: result.latencyMs ?? prev?.latencyMs ?? null,
    lastChecked: now,
  });
}

export function recordRefresh(run: RefreshRun): void {
  lastRefresh = run;
}

export function getLastRefresh(): RefreshRun | null {
  return lastRefresh;
}

// ---------------------------------------------------------------- Helpers
const UA = "DPRK-Media-Mirror/1.0 (+https://koryofront.org)";

/** Today's date in Pyongyang Time (UTC+9), YYYY-MM-DD. */
function todayPyongyang(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

async function fetchWithTimeout(url: string, ms: number, headers?: Record<string, string>): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { headers, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

/** A probe step: returns the item count on success, throws on failure. */
interface SourceDef {
  id: string;
  name: string;
  provides: string;
  group: string;
  /** Include this source in the automated /api/cron/refresh run. */
  refresh: boolean;
  run: () => Promise<number>;
}

const KNOWN_KCNW_ARTICLE =
  "https://kcnawatch.org/newstream/1794717129-402426658/respected-comrade-kim-jong-un-sends-congratulatory-message-to-president-of-palestine";

async function probeEpg(channel: "kctv" | "sports" | "ryongnamsan"): Promise<number> {
  const data = await getEpg(channel, todayPyongyang());
  if (data.source !== "live") throw new Error("EPG upstream unavailable");
  return data.programs.length;
}

async function probeHls(channel: string): Promise<number> {
  const res = await fetchWithTimeout(`https://live.koryocdn.org/${channel}/index.m3u8`, 8000, {
    "User-Agent": UA,
  });
  if (!res.ok) throw new Error(`HLS playlist -> HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("#EXTM3U")) throw new Error("HLS playlist is not a valid playlist");
  return 1;
}

export const SOURCE_DEFS: SourceDef[] = [
  // Koryo Front
  { id: "epg-kctv", name: "Koryo Front — KCTV EPG", provides: "KCTV programme guide", group: "Koryo Front", refresh: true, run: () => probeEpg("kctv") },
  { id: "epg-sports", name: "Koryo Front — Athletic TV EPG", provides: "Athletic TV programme guide", group: "Koryo Front", refresh: true, run: () => probeEpg("sports") },
  { id: "epg-ryongnamsan", name: "Koryo Front — Ryongnamsan EPG", provides: "Ryongnamsan programme guide", group: "Koryo Front", refresh: true, run: () => probeEpg("ryongnamsan") },
  { id: "hls-kctv", name: "Koryo Front — KCTV stream", provides: "KCTV live HLS", group: "Koryo Front", refresh: false, run: () => probeHls("kctv") },
  { id: "hls-sports", name: "Koryo Front — Athletic TV stream", provides: "Athletic TV live HLS", group: "Koryo Front", refresh: false, run: () => probeHls("sports") },
  { id: "hls-ryongnamsan", name: "Koryo Front — Ryongnamsan stream", provides: "Ryongnamsan live HLS", group: "Koryo Front", refresh: false, run: () => probeHls("ryongnamsan") },
  { id: "hls-kcbs", name: "Koryo Front — KCBS stream", provides: "KCBS radio live HLS", group: "Koryo Front", refresh: false, run: () => probeHls("kcbs") },
  { id: "hls-kcbs2", name: "Koryo Front — KCBS-2 stream", provides: "KCBS-2 radio live HLS", group: "Koryo Front", refresh: false, run: () => probeHls("kcbs2") },
  { id: "hls-pyfm", name: "Koryo Front — Pyongyang FM stream", provides: "Pyongyang FM radio live HLS", group: "Koryo Front", refresh: false, run: () => probeHls("pyfm") },
  {
    id: "recordings", name: "Koryo Front — Recordings", provides: "8pm News, Activities, Society & Culture videos", group: "Koryo Front", refresh: true,
    run: async () => (await getRecordings()).length,
  },
  {
    id: "publications", name: "Koryo Front — Publications", provides: "Pyongyang Times / DPR Korea newspapers", group: "Koryo Front", refresh: true,
    run: async () => (await getPublications()).length,
  },
  {
    id: "periodicals", name: "Koryo Front — Periodicals", provides: "Kumsugangsan periodicals", group: "Koryo Front", refresh: true,
    run: async () => (await getPeriodicals()).length,
  },
  {
    id: "kns", name: "Korean News Service (KNS)", provides: "KCNA headlines, full article text", group: "Koryo Front", refresh: true,
    run: async () => (await getKnsNews()).length,
  },
  // KCNA Watch
  {
    id: "kcnw-home", name: "KCNA Watch — Latest headlines", provides: "5 newest headlines (homepage)", group: "KCNA Watch", refresh: true,
    run: async () => (await getKcnaWatchNews()).length,
  },
  {
    id: "kcnw-latest", name: "KCNA Watch — Archive browse", provides: "Latest-articles feed, back to ~2015 (~430k)", group: "KCNA Watch", refresh: true,
    run: async () => (await getKcnwLatest(0, "", "")).articles.length,
  },
  {
    id: "kcnw-search", name: "KCNA Watch — Archive search", provides: "Full 1.37M-article archive search (needs session)", group: "KCNA Watch", refresh: false,
    run: async () => {
      if (!process.env.KCNW_COOKIE) throw new Error("not_configured");
      const r = await getKcnwSearch("Kim Jong Un", "", 0, "");
      if (r.error) throw new Error("search_unavailable");
      return r.count;
    },
  },
  {
    id: "kcnw-article", name: "KCNA Watch — Full article text", provides: "Full article body via session cookie", group: "KCNA Watch", refresh: false,
    run: async () => {
      if (!process.env.KCNW_COOKIE) throw new Error("not_configured");
      const r = await getKcnaWatchArticleBody(KNOWN_KCNW_ARTICLE);
      if (!r.ok) throw new Error(r.error === "session_expired" ? "session_expired" : "article_unavailable");
      return r.blocks.length;
    },
  },
  // .kp sources (plain HTTP only)
  { id: "kp-kcna", name: "KCNA (kcna.kp)", provides: "KCNA wire, English, full text", group: "DPRK sites (.kp)", refresh: true, run: async () => (await getKcnaNews()).length },
  { id: "kp-rodong", name: "Rodong Sinmun", provides: "WPK daily newspaper, Korean, full text", group: "DPRK sites (.kp)", refresh: true, run: async () => (await getRodongNews()).length },
  { id: "kp-minju", name: "Minju Joson", provides: "Cabinet newspaper, Korean, headlines", group: "DPRK sites (.kp)", refresh: true, run: async () => (await getMinjuNews()).length },
  { id: "kp-pytimes", name: "The Pyongyang Times", provides: "English weekly newspaper, full text", group: "DPRK sites (.kp)", refresh: true, run: async () => (await getPyongyangTimesNews()).length },
  { id: "kp-naenara", name: "Naenara", provides: "Government portal, Korean, headlines", group: "DPRK sites (.kp)", refresh: true, run: async () => (await getNaenaraNews()).length },
  { id: "kp-youth", name: "Youth Sinmun", provides: "Youth newspaper, Korean, headlines", group: "DPRK sites (.kp)", refresh: true, run: async () => (await getYouthNews()).length },
  { id: "kp-ryugyong", name: "Ryugyong", provides: "Photo/video centre, photo items", group: "DPRK sites (.kp)", refresh: true, run: async () => (await getRyugyongNews()).length },
  { id: "kp-vok", name: "Voice of Korea", provides: "International radio, Korean, programme text", group: "DPRK sites (.kp)", refresh: true, run: async () => (await getVokNews()).length },
  { id: "kp-korarch", name: "Korean Architecture", provides: "Architecture journal, English, full text", group: "DPRK sites (.kp)", refresh: true, run: async () => (await getKorarchNews()).length },
  { id: "kp-stamps", name: "Korean Stamp", provides: "New stamp issues, stock numbers + PDFs", group: "DPRK sites (.kp)", refresh: true, run: async () => (await getStamps()).length },
];

// ---------------------------------------------------------------- Probing
const PROBE_TIMEOUT_MS = 8000;
const SNAPSHOT_TTL_MS = 60_000;

let cachedSnapshot: { at: number; data: StatusSnapshot } | null = null;

function shortError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes("not_configured")) return "Session not configured";
  if (m.includes("session_expired")) return "Session expired";
  if (m.toLowerCase().includes("aborted") || m.toLowerCase().includes("timeout")) return "Timed out";
  return m.length > 80 ? m.slice(0, 80) + "…" : m;
}

/** Live-probe every source in parallel (8s cap each), cached for 60s. */
export async function getStatusSnapshot(): Promise<StatusSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && now - cachedSnapshot.at < SNAPSHOT_TTL_MS) {
    return { ...cachedSnapshot.data, lastRefresh: getLastRefresh() };
  }
  const checkedAt = new Date().toISOString();
  const settled = await Promise.allSettled(
    SOURCE_DEFS.map(async (def) => {
      const started = Date.now();
      try {
        const count = await Promise.race([
          def.run(),
          new Promise<number>((_, reject) =>
            setTimeout(() => reject(new Error("Timed out")), PROBE_TIMEOUT_MS)
          ),
        ]);
        const latencyMs = Date.now() - started;
        recordOutcome(def.id, { ok: true, count, latencyMs });
        return def.id;
      } catch (e) {
        const latencyMs = Date.now() - started;
        const err = shortError(e);
        recordOutcome(def.id, { ok: false, latencyMs, error: err });
        return def.id;
      }
    })
  );
  void settled;
  const sources: SourceHealth[] = SOURCE_DEFS.map((def) => {
    const rec = healthMap.get(def.id);
    return {
      id: def.id,
      name: def.name,
      provides: def.provides,
      group: def.group,
      status: rec?.status ?? "unknown",
      lastOk: rec?.lastOk ?? null,
      lastError: rec?.lastError ?? null,
      lastCount: rec?.lastCount ?? null,
      latencyMs: rec?.latencyMs ?? null,
      lastChecked: rec?.lastChecked ?? null,
    };
  });
  const snapshot: StatusSnapshot = { checkedAt, sources, lastRefresh: getLastRefresh() };
  cachedSnapshot = { at: now, data: snapshot };
  return snapshot;
}

/** The steps the automated refresh runs (subset of the probes). */
export const REFRESH_DEFS = SOURCE_DEFS.filter((d) => d.refresh);

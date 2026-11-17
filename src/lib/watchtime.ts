/**
 * Watch time stats — how long the user actually watches/listens, per
 * TV channel (kctv, sports, ryongnamsan, mansudae) and radio station
 * (kcbs, kcbs2, pyfm). localStorage-only, keyed `dprk-watchtime`.
 *
 * Shape: { items: { [id]: { total: seconds, days: { "YYYY-MM-DD": seconds } } } }
 * Days are Pyongyang dates (the site's programme clock), pruned to the
 * last 45 days so the record stays small. "Today" reads today's bucket,
 * "7 days" sums the last 7 Pyongyang dates, "All time" reads the total.
 * Only time while actually playing is recorded (the callers gate on
 * their playing state); the enabled flag is checked on every flush, so
 * turning tracking off in Settings stops accumulation immediately.
 */
import { useCallback, useEffect, useRef } from "react";
import { todayPyt } from "./types";
import { getWatchTimeEnabled } from "./settings";

const WATCH_TIME_KEY = "dprk-watchtime";
const KEEP_DAYS = 45;

export interface WatchTotals {
  id: string;
  today: number;
  last7: number;
  all: number;
}

interface WatchStore {
  items: Record<string, { total: number; days: Record<string, number> }>;
}

function emptyStore(): WatchStore {
  return { items: {} };
}

function loadStore(): WatchStore {
  try {
    if (typeof window === "undefined") return emptyStore();
    const raw = window.localStorage.getItem(WATCH_TIME_KEY);
    if (!raw) return emptyStore();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("items" in parsed)) return emptyStore();
    return parsed as WatchStore;
  } catch {
    return emptyStore();
  }
}

function saveStore(store: WatchStore): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WATCH_TIME_KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable or full — stats just won't persist.
  }
}

/** Last `n` Pyongyang dates (YYYY-MM-DD), newest first. */
function lastPyongyangDates(n: number): string[] {
  const out: string[] = [];
  const d = new Date(`${todayPyt()}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out;
}

/** Add seconds of real playing time for one channel/station. */
export function recordWatchSeconds(id: string, seconds: number): void {
  if (seconds <= 0 || !getWatchTimeEnabled()) return;
  const store = loadStore();
  const item = store.items[id] ?? { total: 0, days: {} };
  const today = todayPyt();
  item.total += seconds;
  item.days[today] = (item.days[today] ?? 0) + seconds;
  // Prune buckets older than KEEP_DAYS so the record stays small.
  const keep = new Set(lastPyongyangDates(KEEP_DAYS));
  for (const day of Object.keys(item.days)) {
    if (!keep.has(day)) delete item.days[day];
  }
  store.items[id] = item;
  saveStore(store);
}

/** Totals for every recorded id (ids with no record come back as zeros). */
export function getWatchStats(ids: string[]): WatchTotals[] {
  const store = loadStore();
  const today = todayPyt();
  const week = new Set(lastPyongyangDates(7));
  return ids.map((id) => {
    const item = store.items[id];
    let last7 = 0;
    if (item) {
      for (const [day, seconds] of Object.entries(item.days)) {
        if (week.has(day)) last7 += seconds;
      }
    }
    return {
      id,
      today: item?.days[today] ?? 0,
      last7,
      all: item?.total ?? 0,
    };
  });
}

/** Wipe all recorded watch time. */
export function clearWatchStats(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(WATCH_TIME_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** "2h 15m" / "45m" / "30s" / "0m" — language-neutral abbreviations. */
export function formatWatchDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s === 0) return "0m";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

/**
 * Count playing time for one channel/station. Call with the player's
 * real playing state (true only while media is actually playing, not
 * while buffering or paused). Seconds accumulate locally and flush to
 * storage every 5 seconds and whenever playback stops or the component
 * unmounts — so short sessions are not lost and storage writes stay
 * cheap.
 */
export function useWatchTime(id: string, playing: boolean): void {
  const accRef = useRef(0);
  const flush = useCallback(() => {
    if (accRef.current > 0) {
      recordWatchSeconds(id, accRef.current);
      accRef.current = 0;
    }
  }, [id]);

  useEffect(() => {
    if (!playing) {
      flush();
      return;
    }
    const timer = setInterval(() => {
      accRef.current += 1;
      if (accRef.current >= 5) flush();
    }, 1000);
    return () => {
      clearInterval(timer);
      flush();
    };
  }, [playing, flush]);
}

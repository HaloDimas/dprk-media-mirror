"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ChannelId, EpgData, Program } from "@/lib/types";
import { findNowNext, nowPyt, todayPyt } from "@/lib/types";
import { programTitle, useLanguage } from "@/i18n/LanguageContext";
import { T } from "@/i18n/T";

const TABS: { id: ChannelId; label: string; ko: string }[] = [
  { id: "kctv", label: "KCTV", ko: "조선중앙텔레비죤" },
  { id: "sports", label: "Athletic TV", ko: "체육텔레비죤" },
  { id: "ryongnamsan", label: "Ryongnamsan TV", ko: "룡남산텔레비죤" },
  { id: "mansudae", label: "Mansudae TV", ko: "만수대텔레비죤" },
];

const CHANNEL_NAME: Record<ChannelId, string> = {
  kctv: "KCTV",
  sports: "Athletic TV",
  ryongnamsan: "Ryongnamsan TV",
  mansudae: "Mansudae TV",
};

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function ProgramRow({ p, isNow, isNext }: { p: Program; isNow: boolean; isNext: boolean }) {
  const { lang } = useLanguage();
  const title = programTitle(p, lang);
  return (
    <li
      className={`rounded-lg border px-4 py-3 ${
        isNow
          ? "border-red-300 dark:border-red-600 bg-red-100 dark:bg-red-950/50"
          : isNext
            ? "border-zinc-400 dark:border-zinc-600 bg-zinc-100/60 dark:bg-zinc-800/60"
            : "border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {p.start} – {p.end}
        </span>
        {isNow && (
          <span className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            <T k="schedule.onAirNow" />
          </span>
        )}
        {isNext && (
          <span className="rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
            <T k="schedule.next" />
          </span>
        )}
        <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">{p.category}</span>
      </div>
      <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{title.primary}</p>
      {title.secondary && <p className="text-sm text-zinc-600 dark:text-zinc-400">{title.secondary}</p>}
    </li>
  );
}

export default function ScheduleGuide({
  initialDate,
  initial,
}: {
  initialDate: string;
  initial: Partial<Record<ChannelId, EpgData>>;
}) {
  const { lang, t } = useLanguage();
  const [channel, setChannel] = useState<ChannelId>("kctv");
  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState<Record<ChannelId, EpgData | null>>({
    kctv: initial.kctv ?? null,
    sports: initial.sports ?? null,
    ryongnamsan: initial.ryongnamsan ?? null,
    mansudae: null,
  });
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(true);
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  // Time is read on the client after mount — never during prerender.
  const [now, setNow] = useState("--:--");
  const [today, setToday] = useState(initialDate);

  useEffect(() => {
    setNow(nowPyt());
    setToday(todayPyt());
    const t = setInterval(() => setNow(nowPyt()), 30000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async (ch: ChannelId, d: string) => {
    if (ch === "mansudae") return null;
    try {
      const res = await fetch(`/api/epg?channel=${ch}&date=${d}`);
      if (!res.ok) throw new Error("epg failed");
      const json: EpgData = await res.json();
      setData((prev) => ({ ...prev, [ch]: json }));
      return json;
    } catch {
      return null;
    }
  }, []);

  const loadAll = useCallback(
    async (d: string) => {
      setLoading(true);
      const results = await Promise.all([
        load("kctv", d),
        load("sports", d),
        load("ryongnamsan", d),
      ]);
      setLive(results.some((r) => r?.source === "live"));
      setLoading(false);
    },
    [load]
  );

  // Refetch all channels when the date changes.
  useEffect(() => {
    if (date !== initialDate) {
      setData((prev) => ({ ...prev, kctv: null, sports: null, ryongnamsan: null }));
      setCategory("all");
      loadAll(date);
    } else {
      setLive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const current = data[channel];
  const isToday = date === today;
  const { now: nowProg, next: nextProg } = useMemo(
    () => (current && isToday ? findNowNext(current.programs, now) : { now: null, next: null }),
    [current, isToday, now]
  );

  // Categories present in the current channel's guide (derived from real data).
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of current?.programs ?? []) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [current]);

  const filteredPrograms = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (current?.programs ?? []).filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!needle || p.en.toLowerCase().includes(needle) || p.ko.toLowerCase().includes(needle))
    );
  }, [current, category, q]);

  // Now on all channels (today only).
  const nowAll = useMemo(() => {
    if (!isToday) return null;
    return (["kctv", "sports", "ryongnamsan"] as ChannelId[]).map((ch) => {
      const d = data[ch];
      const nn = d ? findNowNext(d.programs, now) : { now: null, next: null };
      return { ch, now: nn.now, next: nn.next, loaded: !!d };
    });
  }, [data, isToday, now]);

  return (
    <div>
      {/* Now on all channels */}
      {nowAll && (
        <section className="mb-5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 p-4">
          <h2 className="flex items-baseline gap-2 text-sm font-bold text-zinc-900 dark:text-white">
            <span className="inline-block h-4 w-1 rounded bg-red-600" />
            <T k="schedule.nowOnAll" />
            <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400">
              <T k="schedule.pyongyangTimeNow" values={{ time: now }} />
            </span>
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {nowAll.map(({ ch, now: n, next: nx, loaded }) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  channel === ch
                    ? "border-red-300 dark:border-red-600 bg-red-100 dark:bg-red-950/40"
                    : "border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 hover:border-red-800"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  {CHANNEL_NAME[ch]}
                </p>
                {!loaded ? (
                  <p className="mt-1 text-sm text-zinc-500">
                    <T k="schedule.loading" />
                  </p>
                ) : n ? (
                  <>
                    <p className="mt-1 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                      <span className="mr-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        <T k="common.now" />
                      </span>
                      {programTitle(n, lang).primary}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-zinc-500">
                      {n.start} – {n.end}
                    </p>
                    {nx && (
                      <p className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
                        <T k="schedule.next" />: {programTitle(nx, lang).primary} ({nx.start})
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-zinc-500">
                    <T k="schedule.offAir" />
                  </p>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label={t("schedule.channelsAria")}>
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={channel === t.id}
              onClick={() => {
                setChannel(t.id);
                if (t.id !== "mansudae" && !data[t.id]) load(t.id, date);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                channel === t.id ? "bg-red-700 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setDate(shiftDate(date, -1))}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            aria-label={t("schedule.prevDayAria")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> <T k="schedule.prevDay" />
          </button>
          <label className="flex min-w-0 items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label={t("schedule.chooseDate")}
              className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>
          <button
            onClick={() => setDate(shiftDate(date, 1))}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            aria-label={t("schedule.nextDayAria")}
          >
            <T k="schedule.nextDay" /> <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("schedule.searchPlaceholder")} aria-label={t("schedule.searchAria")}
          className="min-w-56 flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-2 text-sm text-zinc-900 dark:text-zinc-100"
          aria-label={t("schedule.filterCategory")}
        >
          <option value="all">
            <T k="schedule.allCategories" values={{ n: (current?.programs ?? []).length }} />
          </option>
          {categories.map(([c, n]) => (
            <option key={c} value={c}>
              {c} ({n})
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        <T k="schedule.allTimes" />{" "}
        <span className="font-mono text-zinc-700 dark:text-zinc-300">{now}</span>
        {!live && current && (
          <span className="ml-2 text-amber-700 dark:text-amber-300">
            <T k="schedule.snapshotWarning" />
          </span>
        )}
      </p>

      {channel === "mansudae" && (
        <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <T k="schedule.mansudaeTitle" />
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            만수대텔레비죤 — <T k="schedule.mansudaeDesc" />
          </p>
        </div>
      )}

      {channel === "ryongnamsan" && current && current.programs.length === 0 && !loading && (
        <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <T k="schedule.ryongnamsanOffAir" />
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            룡남산텔레비죤 — <T k="schedule.ryongnamsanDesc" />
          </p>
        </div>
      )}

      {channel !== "mansudae" && loading && !current && (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          <T k="schedule.loadingGuide" />
        </p>
      )}

      {channel !== "mansudae" && current && current.programs.length > 0 && (
        <>
          <p className="mt-4 text-xs text-zinc-500">
            <T
              k="schedule.showing"
              values={{ shown: filteredPrograms.length, total: current.programs.length, date, channel: CHANNEL_NAME[channel] }}
            />
          </p>
          <ul className="mt-2 space-y-2">
            {filteredPrograms.map((p) => (
              <ProgramRow
                key={`${p.start}-${p.en}`}
                p={p}
                isNow={isToday && nowProg === p}
                isNext={isToday && nextProg === p}
              />
            ))}
          </ul>
          {filteredPrograms.length === 0 && (
            <p className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
              <T k="schedule.noMatch" />
            </p>
          )}
        </>
      )}

      {channel !== "mansudae" && current && current.programs.length === 0 && channel !== "ryongnamsan" && !loading && (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          <T k="schedule.noProgrammes" />
        </p>
      )}

      <p className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
        <T k="schedule.dataNote" />
      </p>
    </div>
  );
}

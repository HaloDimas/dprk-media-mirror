"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChannelId, EpgData, Program } from "@/lib/types";
import { findNowNext, nowPyt, todayPyt } from "@/lib/types";

const TABS: { id: ChannelId; label: string; ko: string }[] = [
  { id: "kctv", label: "KCTV", ko: "조선중앙텔레비죤" },
  { id: "sports", label: "Athletic TV", ko: "체육텔레비죤" },
  { id: "ryongnamsan", label: "Ryongnamsan TV", ko: "룡남산텔레비죤" },
  { id: "mansudae", label: "Mansudae TV", ko: "만수대텔레비죤" },
];

function ProgramRow({ p, isNow, isNext }: { p: Program; isNow: boolean; isNext: boolean }) {
  return (
    <li
      className={`rounded-lg border px-4 py-3 ${
        isNow
          ? "border-red-600 bg-red-950/50"
          : isNext
            ? "border-zinc-600 bg-zinc-800/60"
            : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm font-semibold text-zinc-100">
          {p.start} – {p.end}
        </span>
        {isNow && (
          <span className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            On air now
          </span>
        )}
        {isNext && (
          <span className="rounded bg-zinc-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-zinc-200">
            Next
          </span>
        )}
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">{p.category}</span>
      </div>
      <p className="mt-1 font-medium text-zinc-100">{p.en}</p>
      <p className="text-sm text-zinc-400">{p.ko}</p>
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
    if (ch === "mansudae") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/epg?channel=${ch}&date=${d}`);
      if (!res.ok) throw new Error("epg failed");
      const json: EpgData = await res.json();
      setData((prev) => ({ ...prev, [ch]: json }));
      setLive(json.source === "live");
    } catch {
      setLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch when the date changes.
  useEffect(() => {
    if (date !== initialDate) {
      setData((prev) => ({ ...prev, kctv: null, sports: null, ryongnamsan: null }));
      load(channel, date);
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

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Channels">
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
                channel === t.id ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-zinc-300">
          Date (Pyongyang)
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 [color-scheme:dark]"
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        All times are Pyongyang Time (UTC+9). Current time in Pyongyang:{" "}
        <span className="font-mono text-zinc-300">{now}</span>
        {!live && current && (
          <span className="ml-2 text-amber-300">Showing the saved snapshot — the live guide is currently unreachable.</span>
        )}
      </p>

      {channel === "mansudae" && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-100">Mansudae Television — Coming Soon</h2>
          <p className="mt-1 text-sm text-zinc-400">
            만수대텔레비죤 — Mansudae TV has not started streaming yet and no programme guide has been published.
          </p>
        </div>
      )}

      {channel === "ryongnamsan" && current && current.programs.length === 0 && !loading && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-100">Ryongnamsan TV is off air today</h2>
          <p className="mt-1 text-sm text-zinc-400">
            룡남산텔레비죤 broadcasts on weekdays only. Pick a weekday date above to see its guide.
          </p>
        </div>
      )}

      {channel !== "mansudae" && loading && !current && (
        <p className="mt-6 text-sm text-zinc-400">Loading programme guide…</p>
      )}

      {channel !== "mansudae" && current && current.programs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {current.programs.map((p) => (
            <ProgramRow
              key={`${p.start}-${p.en}`}
              p={p}
              isNow={isToday && nowProg === p}
              isNext={isToday && nextProg === p}
            />
          ))}
        </ul>
      )}

      {channel !== "mansudae" && current && current.programs.length === 0 && channel !== "ryongnamsan" && !loading && (
        <p className="mt-6 text-sm text-zinc-400">
          No programmes listed for this date. Try another date, or check back later.
        </p>
      )}

      <p className="mt-4 text-xs text-zinc-600">
        Programme data mirrored from the Koryo Front programme guide. Times are as published; the guide for a
        future date may change.
      </p>
    </div>
  );
}

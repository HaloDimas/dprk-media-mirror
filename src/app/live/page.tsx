"use client";

import { useEffect, useState } from "react";
import HlsPlayer from "@/components/HlsPlayer";
import { CHANNELS, findNowNext, nowPyt, todayPyt, type ChannelId, type EpgData } from "@/lib/types";

const TV = CHANNELS.filter((c) => c.kind === "tv");

export default function LivePage() {
  const [channel, setChannel] = useState<ChannelId>("kctv");
  const [epg, setEpg] = useState<EpgData | null>(null);
  const [allEpg, setAllEpg] = useState<Record<string, EpgData | null>>({});
  // Time is read on the client after mount — never during prerender.
  const [now, setNow] = useState("--:--");

  const info = TV.find((c) => c.id === channel)!;

  useEffect(() => {
    setNow(nowPyt());
    const t = setInterval(() => setNow(nowPyt()), 30000);
    return () => clearInterval(t);
  }, []);

  // "Now on all channels" — fetch today's EPG for every live channel once.
  useEffect(() => {
    const date = todayPyt();
    let cancelled = false;
    Promise.all(
      TV.filter((c) => c.status === "live" && c.hls).map((c) =>
        fetch(`/api/epg?channel=${c.id}&date=${date}`)
          .then((r) => (r.ok ? (r.json() as Promise<EpgData>) : null))
          .catch(() => null)
          .then((d) => ({ id: c.id, data: d }))
      )
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, EpgData | null> = {};
      for (const r of results) map[r.id] = r.data;
      setAllEpg(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (info.status !== "live" || !info.hls) {
      setEpg(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/epg?channel=${channel}&date=${todayPyt()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: EpgData | null) => {
        if (!cancelled) setEpg(d);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [channel, info.status, info.hls]);

  const { now: nowProg, next: nextProg } = epg ? findNowNext(epg.programs, now) : { now: null, next: null };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">Live TV</h1>

      <section aria-label="Now on all channels">
        <h2 className="border-l-4 border-red-700 pl-3 text-sm font-semibold text-zinc-100">
          Now on all channels <span className="font-normal text-zinc-500">· Pyongyang time {now}</span>
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {TV.filter((c) => c.status === "live" && c.hls).map((c) => {
            const d = allEpg[c.id];
            const { now: n, next: nx } = d ? findNowNext(d.programs, now) : { now: null, next: null };
            const selected = channel === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setChannel(c.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? "border-red-700 bg-red-950/40"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-red-800"
                }`}
              >
                <p className="text-sm font-semibold text-zinc-100">
                  {c.name} <span className="font-normal text-zinc-500">· {c.korean}</span>
                  {selected && <span className="ml-2 rounded bg-red-700 px-1.5 py-0.5 text-[10px] text-white">WATCHING</span>}
                </p>
                {n ? (
                  <p className="mt-1.5 text-sm text-zinc-200">
                    <span className="font-semibold text-red-400">Now:</span> {n.en}
                    <span className="text-zinc-500"> ({n.start}–{n.end})</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm text-zinc-400">Off air at this hour.</p>
                )}
                {nx && (
                  <p className="mt-1 text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-300">Next:</span> {nx.en}
                    <span className="text-zinc-500"> ({nx.start}–{nx.end})</span>
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap gap-1" role="tablist" aria-label="TV channels">
        {TV.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={channel === c.id}
            onClick={() => setChannel(c.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              channel === c.id ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {info.status === "coming-soon" ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-100">{info.name} — Coming Soon</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {info.korean} — {info.note}. There is no live stream or programme guide for this channel yet.
          </p>
        </div>
      ) : (
        <>
          <HlsPlayer channel={info.hls!} title={`${info.name} Live`} />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm">
            <p className="font-semibold text-zinc-100">
              {info.name} <span className="font-normal text-zinc-500">· {info.korean}</span>
            </p>
            {nowProg ? (
              <p className="mt-1">
                <span className="font-semibold text-red-400">Now:</span>{" "}
                <span className="text-zinc-100">
                  {nowProg.en} <span className="text-zinc-500">({nowProg.start} – {nowProg.end})</span>
                </span>
              </p>
            ) : (
              <p className="mt-1 text-zinc-400">Off air at this hour.</p>
            )}
            {nextProg && (
              <p className="mt-1">
                <span className="font-semibold text-zinc-300">Next:</span>{" "}
                <span className="text-zinc-100">
                  {nextProg.en} <span className="text-zinc-500">({nextProg.start} – {nextProg.end})</span>
                </span>
              </p>
            )}
            <p className="mt-1 text-xs text-zinc-500">
              Current time in Pyongyang: <span className="font-mono text-zinc-300">{now}</span>
              {info.id === "ryongnamsan" && " · Ryongnamsan TV broadcasts on weekdays only."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

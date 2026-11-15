"use client";

import { useEffect, useState } from "react";
import HlsPlayer from "@/components/HlsPlayer";
import { CHANNELS, findNowNext, nowPyt, todayPyt, type ChannelId, type EpgData } from "@/lib/types";

const TV = CHANNELS.filter((c) => c.kind === "tv");

export default function LivePage() {
  const [channel, setChannel] = useState<ChannelId>("kctv");
  const [epg, setEpg] = useState<EpgData | null>(null);
  // Time is read on the client after mount — never during prerender.
  const [now, setNow] = useState("--:--");

  const info = TV.find((c) => c.id === channel)!;

  useEffect(() => {
    setNow(nowPyt());
    const t = setInterval(() => setNow(nowPyt()), 30000);
    return () => clearInterval(t);
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

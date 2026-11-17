"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import HlsPlayer from "@/components/HlsPlayer";
import { CHANNELS, findNowNext, nowPyt, todayPyt, type ChannelId, type EpgData, type Program } from "@/lib/types";

const TV = CHANNELS.filter((c) => c.kind === "tv");

/** "HH:MM" -> minutes since midnight (NaN-safe). */
function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

/** How far into a programme we are, 0-100 (0 when the time is unknown). */
function progressPct(p: Program, now: string): number {
  const n = toMin(now);
  const s = toMin(p.start);
  const e = toMin(p.end);
  if (!Number.isFinite(n) || !Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  return Math.min(100, Math.max(0, ((n - s) / (e - s)) * 100));
}

/** Koryo TV watch page for a channel (their own player, opens on koryo.tv). */
function koryoTvUrl(channel: ChannelId): string {
  const slug = channel === "sports" ? "sportstv" : channel;
  return `https://koryo.tv/channel/${slug}`;
}

export default function LivePage() {
  const [channel, setChannel] = useState<ChannelId>("kctv");
  // Video server: Koryo Front CDN (embedded player) or Koryo TV (their own
  // player — Koryo TV binds its sessions to the viewer's IP, so it cannot
  // be proxied through our server and must be watched on koryo.tv itself).
  const [server, setServer] = useState<"koryofront" | "koryotv">("koryofront");
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
      <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Live TV</h1>

      <section aria-label="Now on all channels">
        <h2 className="border-l-4 border-red-700 pl-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
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
                    ? "border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-950/40"
                    : "border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 hover:border-red-800"
                }`}
              >
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {c.name} <span className="font-normal text-zinc-500">· {c.korean}</span>
                  {selected && <span className="ml-2 rounded bg-red-700 px-1.5 py-0.5 text-[10px] text-white">WATCHING</span>}
                </p>
                {n ? (
                  <p className="mt-1.5 text-sm text-zinc-800 dark:text-zinc-200">
                    <span className="font-semibold text-red-600 dark:text-red-400">Now:</span> {n.en}
                    <span className="text-zinc-500"> ({n.start}–{n.end})</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">Off air at this hour.</p>
                )}
                {nx && (
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Next:</span> {nx.en}
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
              channel === c.id ? "bg-red-700 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {info.status === "coming-soon" ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{info.name} — Coming Soon</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {info.korean} — {info.note}. There is no live stream or programme guide for this channel yet.
          </p>
        </div>
      ) : (
        <>
          {/* Video server switcher. */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Video server">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Server:</span>
            <button
              type="button"
              onClick={() => setServer("koryofront")}
              aria-pressed={server === "koryofront"}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                server === "koryofront" ? "bg-red-700 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Koryo Front
            </button>
            <button
              type="button"
              onClick={() => setServer("koryotv")}
              aria-pressed={server === "koryotv"}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                server === "koryotv" ? "bg-red-700 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Koryo TV
            </button>
            {server === "koryotv" && (
              <span className="text-xs text-zinc-500">Opens on koryo.tv (its own player).</span>
            )}
          </div>

          {server === "koryofront" ? (
            <HlsPlayer channel={info.hls!} title={`${info.name} Live`} />
          ) : (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-8 text-center">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Watch {info.name} on Koryo TV</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
                Koryo TV binds its streams to each viewer&apos;s own connection, so it can&apos;t play
                inside this mirror. If the Koryo Front server isn&apos;t working, watch the same
                channel on Koryo TV&apos;s own player instead.
              </p>
              <a
                href={koryoTvUrl(channel)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                Watch {info.name} on Koryo TV
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          )}

          {/* NOW ON AIR — Koryo Front style: current programme + live progress. */}
          <section
            aria-label="Now on air"
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60"
          >
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Now on air</span>
              <span className="ml-auto text-xs text-zinc-500">Pyongyang time {now}</span>
            </div>
            <div className="px-4 py-4">
              {nowProg ? (
                <>
                  <span className="inline-block rounded bg-blue-100 dark:bg-blue-900/70 px-2 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                    {nowProg.category}
                  </span>
                  <h2 className="mt-2 text-lg font-bold leading-snug text-zinc-900 dark:text-white">{nowProg.en}</h2>
                  {nowProg.ko && <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{nowProg.ko}</p>}
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {nowProg.start} – {nowProg.end}
                  </p>
                  {/* Live progress through the current programme. */}
                  <div
                    className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                    role="progressbar"
                    aria-valuenow={Math.round(progressPct(nowProg, now))}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progress through the current programme"
                  >
                    <div
                      className="h-full rounded-full bg-red-600 transition-[width] duration-1000"
                      style={{ width: `${progressPct(nowProg, now)}%` }}
                    />
                  </div>
                  {nextProg && (
                    <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Next:</span> {nextProg.en}{" "}
                      <span className="text-zinc-500">({nextProg.start} – {nextProg.end})</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Off air at this hour. Check the programme guide below for broadcast hours.
                </p>
              )}
            </div>
          </section>

          {/* Programme guide for this channel, today. */}
          <section aria-label="Programme guide">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Programme Guide</h2>
                <p className="text-sm text-zinc-500">
                  {info.name} · {info.korean} · Today
                </p>
              </div>
              <a href="/schedule" className="inline-flex shrink-0 items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline">
                Full schedule <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              {epg && epg.programs.length > 0 ? (
                epg.programs.map((p) => {
                  const isNow = nowProg === p;
                  return (
                    <div
                      key={`${p.start}-${p.en}`}
                      className={`flex gap-4 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 last:border-b-0 ${
                        isNow ? "bg-red-100 dark:bg-red-950/30" : "bg-white/60 dark:bg-zinc-900/60"
                      }`}
                    >
                      <div className="w-20 shrink-0 text-sm">
                        <p className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{p.start}</p>
                        <p className="font-mono text-xs text-zinc-500">– {p.end}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                          {p.en}
                          {isNow && (
                            <span className="ml-2 rounded bg-red-700 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase text-white">
                              Now
                            </span>
                          )}
                        </p>
                        {p.ko && <p className="mt-0.5 text-xs text-zinc-500">{p.ko}</p>}
                        <span className="mt-1.5 inline-block rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                          {p.category}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="bg-white/60 dark:bg-zinc-900/60 px-4 py-6 text-sm text-zinc-600 dark:text-zinc-400">
                  Programme guide unavailable for this channel right now.
                </p>
              )}
            </div>
            {info.id === "ryongnamsan" && (
              <p className="mt-2 text-xs text-zinc-500">Ryongnamsan TV broadcasts on weekdays only.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

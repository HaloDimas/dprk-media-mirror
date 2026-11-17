"use client";

import { useCallback, useRef, useState } from "react";
import { Pause, Play, Radio, Volume1, Volume2, VolumeX } from "lucide-react";
import AudioPlayer, { type AudioPlayerHandle, type AudioStatus } from "@/components/AudioPlayer";
import { RADIO_STATIONS } from "@/lib/types";

/** Per-station artwork: distinct dark gradients + the big Korean letters
    shown on the artwork tile. Artwork is CSS only — the stations have no
    usable official logos, so no external image is loaded. */
const STATION_ART: Record<(typeof RADIO_STATIONS)[number]["id"], { gradient: string; short: string }> = {
  kcbs: { gradient: "from-red-600 via-red-800 to-zinc-950", short: "중앙" },
  kcbs2: { gradient: "from-indigo-600 via-violet-900 to-zinc-950", short: "제2" },
  pyfm: { gradient: "from-amber-500 via-orange-800 to-zinc-950", short: "평양" },
};

function statusText(status: AudioStatus, boost: boolean): string {
  switch (status) {
    case "idle":
      return "Press play to listen live";
    case "connecting":
      return "Connecting…";
    case "live":
      return boost ? "Now playing (boosted ×2)" : "Now playing";
    case "paused":
      return "Paused";
    case "error":
      return "Unavailable";
  }
}

function LiveBadge() {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      Live
    </span>
  );
}

/** Apple Music-style animated equalizer: bars bounce only while the
    station is live; frozen low when paused (see .eq-bar in globals.css). */
function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className={`flex h-4 items-end gap-[3px] ${playing ? "" : "eq-paused"}`} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="eq-bar h-full w-[3px] rounded-full bg-red-500"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: `${0.8 + i * 0.12}s` }}
        />
      ))}
    </span>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={`animate-spin rounded-full border-2 ${
        className ?? "h-5 w-5 border-zinc-600 border-t-white"
      }`}
      aria-hidden="true"
    />
  );
}

/**
 * Radio, rebuilt like a real radio app (Apple Music Listen Now / Radio):
 * a featured KCBS hero, large artwork cards for all three stations, and
 * a sticky Now Playing bar at the bottom with an animated equalizer,
 * volume and Boost ×2. Only one station plays at a time — the parent
 * owns playingId, and each AudioPlayer pauses itself when it goes
 * inactive. Volume / mute / boost are shared across stations and live
 * in the Now Playing bar.
 */
export default function RadioStations() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string>(RADIO_STATIONS[0].id);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [boost, setBoost] = useState(false);
  const [statuses, setStatuses] = useState<Partial<Record<string, AudioStatus>>>({});
  const [errors, setErrors] = useState<Partial<Record<string, string | null>>>({});
  const playerRefs = useRef(new Map<string, AudioPlayerHandle>());

  const featured = RADIO_STATIONS[0]; // KCBS, the flagship station
  const playing = RADIO_STATIONS.find((s) => s.id === playingId) ?? null;
  // The bar keeps showing the last station after pausing, so play resumes it.
  const barStation = playing ?? RADIO_STATIONS.find((s) => s.id === lastId) ?? featured;
  const barStatus: AudioStatus = statuses[barStation.id] ?? "idle";
  const barLive = playing !== null && barStatus === "live";
  const featuredStatus: AudioStatus = statuses[featured.id] ?? "idle";

  const handleStatusChange = useCallback((channel: string, status: AudioStatus) => {
    setStatuses((prev) => (prev[channel] === status ? prev : { ...prev, [channel]: status }));
  }, []);
  const handleErrorChange = useCallback((channel: string, error: string | null) => {
    setErrors((prev) => (prev[channel] === error ? prev : { ...prev, [channel]: error }));
  }, []);
  const handleToggle = useCallback((channel: string | null) => {
    if (channel) setLastId(channel);
    setPlayingId(channel);
  }, []);

  const toggleStation = useCallback((id: string) => {
    playerRefs.current.get(id)?.toggle();
  }, []);
  const barPlayPause = () => {
    toggleStation(playing ? playing.id : barStation.id);
  };

  return (
    <div className="space-y-8">
      {/* Featured hero — KCBS, the flagship station. */}
      <section className="overflow-hidden rounded-3xl border border-zinc-800 shadow-2xl">
        <div className="flex flex-col bg-gradient-to-br from-red-700 via-red-900 to-zinc-950 md:flex-row">
          <div className="relative flex min-h-52 items-center justify-center overflow-hidden p-8 md:w-2/5">
            <Radio className="absolute -bottom-8 -right-6 h-48 w-48 text-white/10" aria-hidden="true" />
            <p className="relative text-center text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              조선중앙방송
            </p>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-3 bg-zinc-950/40 p-6 backdrop-blur-sm md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">Featured station</p>
            <h2 className="text-2xl font-bold text-white md:text-3xl">{featured.name}</h2>
            <p className="text-sm text-zinc-400">
              {featured.korean} · {featured.desc}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <LiveBadge />
              <span className="text-sm text-zinc-300">{statusText(featuredStatus, boost)}</span>
            </div>
            {errors[featured.id] && <p className="text-sm text-red-300">{errors[featured.id]}</p>}
            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                onClick={() => toggleStation(featured.id)}
                aria-label={playingId === featured.id ? `Pause ${featured.name}` : `Play ${featured.name}`}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-red-700 shadow-lg transition-transform hover:scale-105"
              >
                {featuredStatus === "connecting" && playingId === featured.id ? (
                  <Spinner className="h-6 w-6 border-zinc-300 border-t-red-700" />
                ) : playingId === featured.id ? (
                  <Pause className="h-6 w-6" fill="currentColor" aria-hidden="true" />
                ) : (
                  <Play className="ml-0.5 h-6 w-6" fill="currentColor" aria-hidden="true" />
                )}
              </button>
              <span className="text-sm font-medium text-zinc-100">Listen live</span>
            </div>
          </div>
        </div>
      </section>

      {/* All stations — large artwork cards. */}
      <section>
        <h2 className="section-title mb-4 text-lg">All stations</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {RADIO_STATIONS.map((s) => {
            const art = STATION_ART[s.id];
            const isActive = playingId === s.id;
            const st: AudioStatus = statuses[s.id] ?? "idle";
            const err = errors[s.id];
            return (
              <article
                key={s.id}
                className={`group overflow-hidden rounded-2xl border bg-zinc-900/60 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl ${
                  isActive ? "border-red-700 ring-1 ring-red-600/50" : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className={`relative aspect-[16/10] bg-gradient-to-br ${art.gradient}`}>
                  <span className="absolute inset-0 flex items-center justify-center text-5xl font-black tracking-tight text-white/90">
                    {art.short}
                  </span>
                  <Radio className="absolute right-3 top-3 h-6 w-6 text-white/40" aria-hidden="true" />
                  <span className="absolute left-3 top-3">
                    <LiveBadge />
                  </span>
                  {isActive && st === "live" && (
                    <span className="absolute bottom-3 left-3 rounded bg-black/40 px-2 py-1.5">
                      <Equalizer playing />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleStation(s.id)}
                    aria-label={isActive ? `Pause ${s.name}` : `Play ${s.name}`}
                    className={`absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 ${
                      isActive ? "bg-red-600 text-white" : "bg-white text-zinc-900"
                    }`}
                  >
                    {st === "connecting" && isActive ? (
                      <Spinner
                        className={
                          isActive
                            ? "h-5 w-5 border-red-300 border-t-white"
                            : "h-5 w-5 border-zinc-300 border-t-zinc-900"
                        }
                      />
                    ) : isActive ? (
                      <Pause className="h-5 w-5" fill="currentColor" aria-hidden="true" />
                    ) : (
                      <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-zinc-100">{s.name}</h3>
                  <p className="text-sm text-zinc-500">{s.korean}</p>
                  <p className="mt-2 text-sm text-zinc-400">{s.desc}</p>
                  <p className="mt-3 text-xs text-zinc-500">
                    {isActive ? statusText(st, boost) : "Press play to listen live"}
                  </p>
                  {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
                </div>
                <AudioPlayer
                  ref={(el) => {
                    if (el) playerRefs.current.set(s.id, el);
                    else playerRefs.current.delete(s.id);
                  }}
                  channel={s.hls}
                  label={s.name}
                  active={isActive}
                  volume={volume}
                  muted={muted}
                  boost={boost}
                  onToggle={handleToggle}
                  onStatusChange={handleStatusChange}
                  onErrorChange={handleErrorChange}
                />
              </article>
            );
          })}
        </div>
      </section>

      {/* Sticky Now Playing bar — Apple Music mini player. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-lg font-black text-white/90 ${STATION_ART[barStation.id].gradient}`}
            aria-hidden="true"
          >
            {STATION_ART[barStation.id].short}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-zinc-100">{barStation.name}</p>
              {barLive && <LiveBadge />}
              <Equalizer playing={barLive} />
            </div>
            <p className="truncate text-xs text-zinc-400">
              {!playing && barStatus === "idle"
                ? "Select a station to listen live"
                : statusText(barStatus, boost)}
            </p>
            {playing && errors[playing.id] && (
              <p className="truncate text-xs text-red-300">{errors[playing.id]}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
              className="inline-flex items-center justify-center text-zinc-400 transition-colors hover:text-zinc-100"
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              ) : volume < 0.5 ? (
                <Volume1 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : Math.round(volume * 100)}
              onChange={(e) => {
                const v = Number(e.target.value) / 100;
                setVolume(v);
                setMuted(v === 0);
              }}
              aria-label={`Volume for ${barStation.name}`}
              className="h-1.5 w-12 cursor-pointer accent-red-600 min-[420px]:w-16 sm:w-24"
            />
            <span className="hidden w-8 text-right text-xs text-zinc-500 sm:block">
              {muted ? 0 : Math.round(volume * 100)}%
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBoost((b) => !b)}
            aria-pressed={boost}
            title={boost ? "Turn off volume boost" : "Boost volume ×2 for quiet stations"}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
              boost ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
            }`}
          >
            Boost ×2
          </button>
          <button
            type="button"
            onClick={barPlayPause}
            aria-label={playing ? `Pause ${playing.name}` : `Play ${barStation.name}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-colors hover:bg-red-500"
          >
            {playing && barStatus === "connecting" ? (
              <Spinner />
            ) : playing ? (
              <Pause className="h-5 w-5" fill="currentColor" aria-hidden="true" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

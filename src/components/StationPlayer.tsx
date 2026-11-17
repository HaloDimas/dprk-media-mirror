"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Pause, Play, Radio, Volume1, Volume2, VolumeX } from "lucide-react";
import AudioPlayer, { type AudioPlayerHandle, type AudioStatus } from "@/components/AudioPlayer";
import { Equalizer, LiveBadge, Spinner, STATION_ART, STATION_DESC_KEY } from "@/components/RadioStations";
import { RADIO_STATIONS } from "@/lib/types";
import { useWatchTime } from "@/lib/watchtime";
import { useLanguage } from "@/i18n/LanguageContext";
import { T } from "@/i18n/T";

type Station = (typeof RADIO_STATIONS)[number];

/**
 * One station's own page: a focused player for a single station.
 * Reuses the headless AudioPlayer engine (same as /radio) and the
 * Now Playing bar's controls (play/pause, volume, mute, Boost ×2,
 * status, equalizer) — in-flow here instead of fixed to the viewport.
 * Watch time is recorded while actually playing, same as /radio.
 */
export default function StationPlayer({ station }: { station: Station }) {
  const { t } = useLanguage();
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [boost, setBoost] = useState(false);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayerHandle | null>(null);

  useWatchTime(station.id, status === "live");

  const art = STATION_ART[station.id];
  const others = RADIO_STATIONS.filter((s) => s.id !== station.id);
  const live = playing && status === "live";

  const statusText = (st: AudioStatus, b: boolean): string => {
    switch (st) {
      case "idle":
        return t("radio.statusIdle");
      case "connecting":
        return t("radio.statusConnecting");
      case "live":
        return b ? t("radio.statusLiveBoosted") : t("radio.statusLive");
      case "paused":
        return t("radio.statusPaused");
      case "error":
        return t("radio.statusUnavailable");
    }
  };

  const handleStatusChange = useCallback((channel: string, st: AudioStatus) => {
    void channel;
    setStatus(st);
  }, []);
  const handleErrorChange = useCallback((channel: string, err: string | null) => {
    void channel;
    setError(err);
  }, []);
  const handleToggle = useCallback((channel: string | null) => {
    setPlaying(channel !== null);
  }, []);
  const toggle = useCallback(() => {
    playerRef.current?.toggle();
  }, []);

  return (
    <div className="space-y-8 pb-6">
      <Link href="/radio" className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> <T k="radio.station.backToAll" />
      </Link>

      {/* Station hero — same artwork language as the /radio cards. */}
      <section className="overflow-hidden rounded-3xl border border-zinc-800 shadow-2xl">
        <div className={`flex flex-col bg-gradient-to-br ${art.gradient} md:flex-row`}>
          <div className="relative flex min-h-52 items-center justify-center overflow-hidden p-8 md:w-2/5">
            <Radio className="absolute -bottom-8 -right-6 h-48 w-48 text-white/10" aria-hidden="true" />
            <p className="relative text-center text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              {station.korean}
            </p>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-3 bg-zinc-950/40 p-6 backdrop-blur-sm md:p-10">
            <h1 className="text-2xl font-bold text-white md:text-3xl">{station.name}</h1>
            <p className="text-sm text-zinc-400">
              {station.korean} · {t(STATION_DESC_KEY[station.id])}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <LiveBadge />
              <span className="text-sm text-zinc-300">{statusText(status, boost)}</span>
              {live && <Equalizer playing />}
            </div>
            {error && <p className="text-sm text-red-300">{t(error)}</p>}
            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? t("radio.pauseAria", { name: station.name }) : t("radio.playAria", { name: station.name })}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-red-700 shadow-lg transition-transform hover:scale-105"
              >
                {status === "connecting" && playing ? (
                  <Spinner className="h-6 w-6 border-zinc-300 border-t-red-700" />
                ) : playing ? (
                  <Pause className="h-6 w-6" fill="currentColor" aria-hidden="true" />
                ) : (
                  <Play className="ml-0.5 h-6 w-6" fill="currentColor" aria-hidden="true" />
                )}
              </button>
              <span className="text-sm font-medium text-zinc-100">
                <T k="radio.listenLive" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Control bar — the /radio Now Playing bar's controls, in-flow. */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white/85 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-lg font-black text-white/90 ${art.gradient}`}
          aria-hidden="true"
        >
          {art.short}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{station.name}</p>
          <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
            {!playing && status === "idle" ? t("radio.selectStation") : statusText(status, boost)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? t("radio.unmute") : t("radio.mute")}
            className="inline-flex items-center justify-center text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
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
            aria-label={t("radio.volumeAria", { name: station.name })}
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
          title={boost ? t("radio.boostOn") : t("radio.boostOff")}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
            boost ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
          }`}
        >
          <T k="radio.boost" />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t("radio.pauseAria", { name: station.name }) : t("radio.playAria", { name: station.name })}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-colors hover:bg-red-500"
        >
          {playing && status === "connecting" ? (
            <Spinner />
          ) : playing ? (
            <Pause className="h-5 w-5" fill="currentColor" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true" />
          )}
        </button>
      </div>

      <AudioPlayer
        ref={(el) => {
          playerRef.current = el;
        }}
        channel={station.hls}
        label={station.name}
        active={playing}
        volume={volume}
        muted={muted}
        boost={boost}
        onToggle={handleToggle}
        onStatusChange={handleStatusChange}
        onErrorChange={handleErrorChange}
      />

      {/* Other stations */}
      <section>
        <h2 className="section-title mb-4 text-lg">
          <T k="radio.station.otherStations" />
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {others.map((s) => {
            const oArt = STATION_ART[s.id];
            return (
              <Link
                key={s.id}
                href={`/radio/${s.id}`}
                className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white/60 shadow-lg transition-all hover:-translate-y-0.5 hover:border-red-800 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className={`relative aspect-[16/10] bg-gradient-to-br ${oArt.gradient}`}>
                  <span className="absolute inset-0 flex items-center justify-center text-5xl font-black tracking-tight text-white/90">
                    {oArt.short}
                  </span>
                  <Radio className="absolute right-3 top-3 h-6 w-6 text-white/40" aria-hidden="true" />
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-zinc-900 group-hover:text-red-600 dark:text-zinc-100 dark:group-hover:text-red-400">
                    {s.name}
                  </h3>
                  <p className="text-sm text-zinc-500">{s.korean}</p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t(STATION_DESC_KEY[s.id])}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                    <T k="radio.station.openStation" />
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-zinc-500">
        <T k="radio.note" />
      </p>
    </div>
  );
}

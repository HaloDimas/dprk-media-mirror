"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";
import Hls from "hls.js";

type Status = "idle" | "connecting" | "live" | "paused" | "error";

/**
 * Radio player with real controls: play/pause, volume, mute, a LIVE badge,
 * a clear status (connecting / live / paused / unavailable), and a volume
 * BOOST for stations that broadcast very quietly (KCBS measured ~-60 dB
 * while the other stations are ~-19 dB).
 *
 * Boost is done with the Web Audio API: the <audio> element is routed
 * through a GainNode (up to 2x) and a DynamicsCompressor so a loud
 * programme cannot clip when boost is on. Only one station plays at a
 * time — the parent flips `active` off when another station starts, and
 * this player pauses itself.
 */
export default function AudioPlayer({
  channel,
  label,
  active,
  onToggle,
}: {
  channel: string;
  label: string;
  active: boolean;
  onToggle: (channel: string | null) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [boost, setBoost] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    // HLS base: a Cloudflare Worker proxy when NEXT_PUBLIC_HLS_PROXY is set
    // (free, unmetered bandwidth — Vercel Hobby caps origin transfer at
    // 10 GB/month and one hour of KCTV is ~4.3 GB), else our /api/hls.
    const HLS_BASE = (process.env.NEXT_PUBLIC_HLS_PROXY || "").replace(/\/$/, "") || "/api/hls";
    const src = `${HLS_BASE}/${channel}/index.m3u8`;

    // Route the element through Web Audio so we can boost above 100%.
    // Volume is controlled by the GainNode only; the element stays at 1.0.
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const source = ctx.createMediaElementSource(audio);
        const gain = ctx.createGain();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -24;
        comp.knee.value = 30;
        comp.ratio.value = 12;
        comp.attack.value = 0.003;
        comp.release.value = 0.25;
        source.connect(gain);
        gain.connect(comp);
        comp.connect(ctx.destination);
        ctxRef.current = ctx;
        gainRef.current = gain;
        audio.volume = 1;
      }
    } catch {
      // Web Audio unavailable — fall back to the plain element volume.
      ctxRef.current = null;
      gainRef.current = null;
    }

    if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      audio.src = src;
    } else if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(audio);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setError("This station is currently unavailable.");
          setStatus("error");
        }
      });
    } else {
      setError("Your browser cannot play this audio stream.");
      setStatus("error");
    }

    const onPlaying = () => setStatus("live");
    const onWaiting = () => setStatus("connecting");
    const onPause = () => setStatus((s) => (s === "error" ? s : "paused"));
    const onError = () => {
      setError("This station is currently unavailable.");
      setStatus("error");
    };
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      // Stop playback for real when leaving the page.
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => undefined);
        ctxRef.current = null;
        gainRef.current = null;
      }
    };
  }, [channel]);

  // Another station started: pause this one.
  useEffect(() => {
    if (!active) audioRef.current?.pause();
  }, [active]);

  // Apply volume / mute / boost through the GainNode (or the element if
  // Web Audio is unavailable).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const level = muted ? 0 : volume;
    if (gainRef.current) {
      gainRef.current.gain.value = level * (boost ? 2 : 1);
    } else {
      audio.volume = Math.min(1, level);
      audio.muted = muted;
    }
  }, [volume, muted, boost]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (active) {
      audio.pause();
      onToggle(null);
    } else {
      setStatus("connecting");
      setError(null);
      onToggle(channel);
      // Resume the AudioContext in the click handler (user gesture), so
      // the Web Audio graph is allowed to output sound.
      if (ctxRef.current && ctxRef.current.state === "suspended") {
        ctxRef.current.resume().catch(() => undefined);
      }
      // Direct call in the click handler so the browser counts it as a
      // user gesture (autoplay policy).
      audio.play().catch(() => {
        setError("Could not start this station. Try again.");
        setStatus("error");
        onToggle(null);
      });
    }
  };

  const isLive = status === "live";
  const isBusy = status === "connecting";

  return (
    <div>
      {/* crossOrigin is required: the element is routed through Web Audio
          (createMediaElementSource) for the Boost gain, and cross-origin
          media without CORS is silenced by the Web Audio API — that is
          why the radio went mute on every station once the streams moved
          to the cross-origin Cloudflare Worker proxy. The Worker sends
          Access-Control-Allow-Origin: *, so anonymous CORS works. */}
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" className="hidden" aria-label={label} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlayPause}
          aria-label={active ? `Pause ${label}` : `Play ${label}`}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold transition-colors ${
            active ? "bg-red-600 text-white hover:bg-red-500" : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
          }`}
        >
          {isBusy ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-white" aria-hidden="true" />
          ) : active ? (
            <Pause className="h-5 w-5" fill="currentColor" aria-hidden="true" />
          ) : (
            <Play className="h-5 w-5" fill="currentColor" aria-hidden="true" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1.5 rounded bg-red-600/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                Live
              </span>
            )}
            <span className="truncate text-xs text-zinc-400">
              {status === "idle" && "Press play to listen live"}
              {status === "connecting" && "Connecting…"}
              {status === "live" && (boost ? "Now playing (boosted ×2)" : "Now playing")}
              {status === "paused" && "Paused"}
              {status === "error" && "Unavailable"}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
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
              aria-label={`Volume for ${label}`}
              className="h-1.5 w-full cursor-pointer accent-red-600"
            />
            <span className="w-8 text-right text-xs text-zinc-500">
              {muted ? 0 : Math.round(volume * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setBoost((b) => !b)}
              aria-pressed={boost}
              title={boost ? "Turn off volume boost" : "Boost volume ×2 for quiet stations"}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                boost
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
              }`}
            >
              Boost ×2
            </button>
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

type Status = "idle" | "connecting" | "live" | "paused" | "error";

/**
 * Radio player with real controls: play/pause, volume, mute, a LIVE badge
 * and a clear status (connecting / live / paused / unavailable).
 * HLS audio through our own proxy, same as TV. Only one station plays at a
 * time — the parent flips `active` off when another station starts, and this
 * player pauses itself.
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
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    const src = `/api/hls/${channel}/index.m3u8`;

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
    };
  }, [channel]);

  // Another station started: pause this one.
  useEffect(() => {
    if (!active) audioRef.current?.pause();
  }, [active]);

  // Apply volume / mute.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

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
      <audio ref={audioRef} preload="none" className="hidden" aria-label={label} />
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
            <span aria-hidden="true">❚❚</span>
          ) : (
            <span aria-hidden="true">▶</span>
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
              {status === "live" && "Now playing"}
              {status === "paused" && "Paused"}
              {status === "error" && "Unavailable"}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
            >
              {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔈" : "🔊"}
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
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

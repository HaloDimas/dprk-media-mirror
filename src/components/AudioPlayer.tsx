"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import Hls from "hls.js";

export type AudioStatus = "idle" | "connecting" | "live" | "paused" | "error";

export interface AudioPlayerHandle {
  /** Play if idle/paused, pause if playing. Runs synchronously so a call
      from a click handler still counts as a user gesture (autoplay policy). */
  toggle: () => void;
}

/**
 * Headless radio audio engine: one instance per station, rendering only
 * the hidden <audio> element. All visible controls (card play button,
 * hero play button, sticky Now Playing bar) drive it through the
 * imperative `toggle` handle, and status/error are lifted to the parent
 * so the cards and the bar can show them. Volume / mute / boost are
 * controlled props (owned by the parent, shared across stations).
 *
 * The audio pipeline is unchanged: the element is routed through the
 * Web Audio API (GainNode up to 2x + DynamicsCompressor) for the Boost
 * feature — KCBS measured ~-60 dB while the other stations are ~-19 dB.
 * Only one station plays at a time — the parent flips `active` off when
 * another station starts, and this player pauses itself.
 */
export default function AudioPlayer({
  channel,
  label,
  active,
  volume,
  muted,
  boost,
  onToggle,
  onStatusChange,
  onErrorChange,
  ref,
}: {
  channel: string;
  label: string;
  active: boolean;
  volume: number;
  muted: boolean;
  boost: boolean;
  onToggle: (channel: string | null) => void;
  onStatusChange?: (channel: string, status: AudioStatus) => void;
  onErrorChange?: (channel: string, error: string | null) => void;
  ref?: Ref<AudioPlayerHandle>;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [error, setError] = useState<string | null>(null);

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
          setError("radio.errUnavailable");
          setStatus("error");
        }
      });
    } else {
      setError("radio.errBrowser");
      setStatus("error");
    }

    const onPlaying = () => setStatus("live");
    const onWaiting = () => setStatus("connecting");
    const onPause = () => setStatus((s) => (s === "error" ? s : "paused"));
    const onError = () => {
      setError("radio.errUnavailable");
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

  // Lift status / error up so the station card and the Now Playing bar
  // can show them (the engine itself renders nothing visible).
  useEffect(() => {
    onStatusChange?.(channel, status);
  }, [status, channel, onStatusChange]);
  useEffect(() => {
    onErrorChange?.(channel, error);
  }, [error, channel, onErrorChange]);

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
        setError("radio.errStart");
        setStatus("error");
        onToggle(null);
      });
    }
  };

  useImperativeHandle(ref, () => ({ toggle: handlePlayPause }));

  return (
    <div>
      {/* crossOrigin is required: the element is routed through Web Audio
          (createMediaElementSource) for the Boost gain, and cross-origin
          media without CORS is silenced by the Web Audio API — that is
          why the radio went mute on every station once the streams moved
          to the cross-origin Cloudflare Worker proxy. The Worker sends
          Access-Control-Allow-Origin: *, so anonymous CORS works. */}
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" className="hidden" aria-label={label} />
    </div>
  );
}

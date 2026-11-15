"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

/**
 * Live TV player. The video element is fed ONLY our own HLS proxy
 * (/api/hls/<channel>/index.m3u8) — the browser never touches the CDN.
 *
 * The live CDN occasionally drops a segment or stalls, which hls.js reports
 * as a fatal error. Instead of giving up (and forcing a page refresh), the
 * player auto-retries with backoff and only shows the "unavailable" message
 * after several failed attempts — with a manual Retry button.
 *
 * Bandwidth: KCTV only exists as one 1080p50 rendition (~9.5 Mbps), so
 * there is no lower-quality video to switch to — transcoding would need a
 * 24/7 server. The low-bandwidth option is therefore audio-only (Data
 * saver): the KCBS radio stream at ~0.1 Mbps, roughly 100x less data.
 * The player detects a slow connection (fragment downloads slower than
 * real-time, or the browser reporting a slow effective connection type)
 * and offers to switch to audio-only.
 */
const MAX_RETRIES = 5;
// A fragment is "slow" when it takes longer to download than it plays.
const SLOW_FRAG_COUNT = 2;

export default function HlsPlayer({
  channel,
  title,
  poster,
}: {
  channel: string;
  title: string;
  poster?: string;
}) {
  const mediaRef = useRef<HTMLMediaElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fragStartRef = useRef(0);
  const slowFragsRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [audioOnly, setAudioOnly] = useState(false);
  const [slowDetected, setSlowDetected] = useState(false);
  // Subtitles: the stream carries an English subtitle track (DEFAULT/AUTOSELECT
  // in the manifest). hls.js loads it; the toggle switches it on/off.
  const [subsAvailable, setSubsAvailable] = useState(false);
  const [subsOn, setSubsOn] = useState(true);

  const toggleSubs = () => {
    const hls = hlsRef.current;
    if (!hls || !subsAvailable) return;
    const next = !subsOn;
    hls.subtitleTrack = next ? 0 : -1;
    setSubsOn(next);
  };

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    setError(null);
    setLoading(true);
    setReconnecting(false);
    setRetryAttempt(0);
    setSlowDetected(false);
    slowFragsRef.current = 0;
    setSubsAvailable(false);
    setSubsOn(true);
    // Data saver: the KCBS radio stream (~0.1 Mbps) instead of the TV video.
    // HLS base: a Cloudflare Worker proxy when NEXT_PUBLIC_HLS_PROXY is set
    // (free, unmetered bandwidth — Vercel Hobby caps origin transfer at
    // 10 GB/month and one hour of KCTV is ~4.3 GB), else our /api/hls.
    const HLS_BASE = (process.env.NEXT_PUBLIC_HLS_PROXY || "").replace(/\/$/, "") || "/api/hls";
    const src = audioOnly ? `${HLS_BASE}/kcbs/index.m3u8` : `${HLS_BASE}/${channel}/index.m3u8`;
    let stopped = false;
    let attempts = 0;

    // Browser-level slow-connection hint (Chromium/Edge/Android only).
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    if (conn && ["slow-2g", "2g", "3g"].includes(conn.effectiveType ?? "")) {
      setSlowDetected(true);
    }

    const clearRetryTimer = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const destroyHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    const onFatalError = () => {
      setError("Stream is currently unavailable. Please try again later.");
      setLoading(false);
      setReconnecting(false);
    };

    /** Full re-init after a backoff delay. Returns false when out of retries. */
    const scheduleRetry = (init: () => void) => {
      if (stopped) return false;
      if (attempts >= MAX_RETRIES) {
        onFatalError();
        return false;
      }
      attempts += 1;
      setRetryAttempt(attempts);
      setReconnecting(true);
      setLoading(false);
      const delay = Math.min(30000, 2000 * 2 ** (attempts - 1));
      clearRetryTimer();
      retryTimerRef.current = setTimeout(() => {
        if (stopped) return;
        destroyHls();
        init();
      }, delay);
      return true;
    };

    /** Manual retry from the error overlay (resets the backoff). */
    const manualRetry = () => {
      clearRetryTimer();
      attempts = 0;
      setRetryAttempt(0);
      setError(null);
      setReconnecting(true);
      setLoading(false);
      destroyHls();
      initHls();
    };
    // Expose the manual retry to the button rendered below.
    (media as HTMLMediaElement & { __retry?: () => void }).__retry = manualRetry;

    // Ground truth that playback resumed: the media element fires `playing`
    // whenever it actually starts (or restarts) playing. Clear the
    // reconnecting overlay here too — MANIFEST_PARSED alone is not reliable
    // after a retry re-init (the video can resume from the old buffer
    // before the new manifest parses, leaving the text stuck on screen).
    const onPlaying = () => {
      attempts = 0;
      setRetryAttempt(0);
      setReconnecting(false);
      setLoading(false);
    };
    media.addEventListener("playing", onPlaying);

    const initHls = () => {
      if (stopped) return;
      // Deeper buffer + more live latency margin, so a slow segment does
      // not stall playback. KCTV runs at ~9.5 Mbps (full 1080p50 drama),
      // roughly 10x the data rate of Sports (~1 Mbps) and 40x Ryongnamsan
      // (~0.25 Mbps) right now, so it needs the most cushion: a 6s KCTV
      // segment is ~7 MB, and a slow link takes seconds to fetch it.
      const hls = new Hls({
        maxBufferLength: 90,
        maxMaxBufferLength: 180,
        liveSyncDurationCount: 6,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(media);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (stopped) return;
        attempts = 0;
        setRetryAttempt(0);
        setReconnecting(false);
        setLoading(false);
        media.play().catch(() => undefined);
      });
      // Slow-connection detection: if a fragment takes longer to download
      // than it plays, we are falling behind real-time. Two in a row means
      // the link cannot keep up with this stream.
      hls.on(Hls.Events.FRAG_LOADING, () => {
        fragStartRef.current = performance.now();
      });
      hls.on(Hls.Events.FRAG_LOADED, (_e, data) => {
        if (stopped) return;
        const loadMs = performance.now() - fragStartRef.current;
        const durMs = (data.frag.duration || 0) * 1000;
        if (durMs > 0 && loadMs > durMs) {
          slowFragsRef.current += 1;
          if (slowFragsRef.current >= SLOW_FRAG_COUNT) setSlowDetected(true);
        } else {
          slowFragsRef.current = 0;
        }
      });
      // Subtitle track from the manifest (English). Enable it by default.
      // Video only — the audio-only radio stream has no subtitles.
      if (!audioOnly) {
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
          if (stopped) return;
          if (hls.subtitleTracks.length > 0) {
            setSubsAvailable(true);
            hls.subtitleTrack = 0;
            setSubsOn(true);
          }
        });
      }
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (stopped || !data.fatal) return;
        // Media errors (bad segment / codec hiccup) are usually fixed by
        // the built-in recovery — try that before a full re-init.
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try {
            hls.recoverMediaError();
            return;
          } catch {
            // Fall through to a full re-init below.
          }
        }
        scheduleRetry(initHls);
      });
    };

    const onMediaError = () => {
      // Safari native path: reset the source after a short delay.
      if (stopped) return;
      if (attempts >= MAX_RETRIES) {
        onFatalError();
        return;
      }
      attempts += 1;
      setRetryAttempt(attempts);
      setReconnecting(true);
      setLoading(false);
      clearRetryTimer();
      retryTimerRef.current = setTimeout(() => {
        if (stopped) return;
        media.removeAttribute("src");
        media.load();
        media.src = src;
        media.play().catch(() => undefined);
      }, Math.min(30000, 2000 * 2 ** (attempts - 1)));
    };

    if (media.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari: native HLS
      media.src = src;
      media.play().catch(() => undefined);
      const onCanPlay = () => setLoading(false);
      media.addEventListener("canplay", onCanPlay);
      media.addEventListener("error", onMediaError);
      return () => {
        stopped = true;
        clearRetryTimer();
        media.removeEventListener("canplay", onCanPlay);
        media.removeEventListener("error", onMediaError);
        media.removeEventListener("playing", onPlaying);
        // Stop playback for real when leaving the page: merely removing
        // the element does not reliably stop the audio in all browsers.
        media.pause();
        media.removeAttribute("src");
        media.load();
      };
    }

    if (Hls.isSupported()) {
      initHls();
      return () => {
        stopped = true;
        clearRetryTimer();
        destroyHls();
        media.removeEventListener("playing", onPlaying);
        // Stop playback for real when leaving the page: hls.destroy()
        // alone does not pause the media element, so the audio can keep
        // playing after navigation in some browsers.
        media.pause();
        media.removeAttribute("src");
        media.load();
      };
    }

    setError("Your browser cannot play live HLS streams.");
    setLoading(false);
  }, [channel, audioOnly]);

  const handleRetryClick = () => {
    const media = mediaRef.current;
    const retry = (media as (HTMLMediaElement & { __retry?: () => void }) | null)?.__retry;
    if (retry) retry();
  };

  if (audioOnly) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Audio only · Data saver</p>
        <h3 className="mt-2 text-base font-semibold text-white">
          {title} — audio
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Playing the KCBS radio audio (~0.1 Mbps) instead of the TV video (~9.5 Mbps for KCTV).
          Uses roughly 100x less data.
        </p>
        <audio
          ref={(el) => {
            mediaRef.current = el;
          }}
          className="mt-4 w-full"
          controls
          playsInline
          aria-label={`${title} audio only`}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAudioOnly(false)}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Back to video
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-300">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video
        ref={(el) => {
          mediaRef.current = el;
        }}
        className="h-full w-full"
        controls
        playsInline
        poster={poster}
        aria-label={title}
      />
      {subsAvailable && (
        <button
          type="button"
          onClick={toggleSubs}
          aria-pressed={subsOn}
          title={subsOn ? "Turn subtitles off" : "Turn subtitles on (English)"}
          className={`absolute right-3 top-3 z-10 rounded-md px-2.5 py-1 text-xs font-bold tracking-wide shadow ${
            subsOn ? "bg-red-700 text-white" : "bg-black/70 text-zinc-300 hover:bg-black/90"
          }`}
        >
          CC
        </button>
      )}
      <button
        type="button"
        onClick={() => setAudioOnly(true)}
        title="Data saver: switch to audio only (uses ~100x less data)"
        className="absolute left-3 top-3 z-10 rounded-md bg-black/70 px-2.5 py-1 text-xs font-bold tracking-wide text-zinc-300 shadow hover:bg-black/90"
      >
        Data saver
      </button>
      {slowDetected && !error && (
        <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-center gap-2 bg-amber-950/90 px-4 py-2 text-center text-xs text-amber-200">
          <span>Slow connection detected — this stream may buffer.</span>
          <button
            type="button"
            onClick={() => setAudioOnly(true)}
            className="rounded bg-amber-700 px-2 py-0.5 font-bold text-white hover:bg-amber-600"
          >
            Switch to audio only
          </button>
          <button
            type="button"
            onClick={() => setSlowDetected(false)}
            aria-label="Dismiss slow connection warning"
            className="rounded px-1.5 py-0.5 text-amber-300 hover:bg-amber-900"
          >
            ✕
          </button>
        </div>
      )}
      {loading && !error && !reconnecting && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-zinc-300">
          Connecting to live stream…
        </div>
      )}
      {reconnecting && !error && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-sm text-zinc-300">
          <p>Reconnecting to live stream…</p>
          <p className="text-xs text-zinc-500">
            Attempt {retryAttempt} of {MAX_RETRIES} — no need to refresh.
          </p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-6 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <p className="text-xs text-zinc-400">
            The channel may be off air right now. Check the programme guide for broadcast hours.
          </p>
          <button
            type="button"
            onClick={handleRetryClick}
            className="mt-1 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Retry stream
          </button>
        </div>
      )}
    </div>
  );
}

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
 */
const MAX_RETRIES = 5;

export default function HlsPlayer({
  channel,
  title,
  poster,
}: {
  channel: string;
  title: string;
  poster?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
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
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    setLoading(true);
    setReconnecting(false);
    setRetryAttempt(0);
    setSubsAvailable(false);
    setSubsOn(true);
    const src = `/api/hls/${channel}/index.m3u8`;
    let stopped = false;
    let attempts = 0;

    // Ground truth that playback resumed: the video element fires `playing`
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
    video.addEventListener("playing", onPlaying);

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
    (video as HTMLVideoElement & { __retry?: () => void }).__retry = manualRetry;

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
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (stopped) return;
        attempts = 0;
        setRetryAttempt(0);
        setReconnecting(false);
        setLoading(false);
        video.play().catch(() => undefined);
      });
      // Subtitle track from the manifest (English). Enable it by default.
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        if (stopped) return;
        if (hls.subtitleTracks.length > 0) {
          setSubsAvailable(true);
          hls.subtitleTrack = 0;
          setSubsOn(true);
        }
      });
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

    const onVideoError = () => {
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
        video.removeAttribute("src");
        video.load();
        video.src = src;
        video.play().catch(() => undefined);
      }, Math.min(30000, 2000 * 2 ** (attempts - 1)));
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari: native HLS
      video.src = src;
      video.play().catch(() => undefined);
      const onCanPlay = () => setLoading(false);
      video.addEventListener("canplay", onCanPlay);
      video.addEventListener("error", onVideoError);
      return () => {
        stopped = true;
        clearRetryTimer();
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("error", onVideoError);
        video.removeEventListener("playing", onPlaying);
        // Stop playback for real when leaving the page: merely removing
        // the element does not reliably stop the audio in all browsers.
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }

    if (Hls.isSupported()) {
      initHls();
      return () => {
        stopped = true;
        clearRetryTimer();
        destroyHls();
        video.removeEventListener("playing", onPlaying);
        // Stop playback for real when leaving the page: hls.destroy()
        // alone does not pause the media element, so the audio can keep
        // playing after navigation in some browsers.
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }

    setError("Your browser cannot play live HLS streams.");
    setLoading(false);
  }, [channel]);

  const handleRetryClick = () => {
    const video = videoRef.current;
    const retry = (video as (HTMLVideoElement & { __retry?: () => void }) | null)?.__retry;
    if (retry) retry();
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
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

"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, PictureInPicture2, X } from "lucide-react";
import Hls from "hls.js";

/**
 * Live TV player. The video element is fed ONLY our own HLS proxy
 * (the Cloudflare Worker when NEXT_PUBLIC_HLS_PROXY is set, else
 * /api/hls/<channel>/index.m3u8) — the browser never touches the CDN.
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
 *
 * Extra features (below the video): a live-edge badge with how far behind
 * live you are + a "Jump to live" button, playback speed (handy to catch
 * up to live), picture-in-picture, a screenshot button (the proxy sends
 * CORS headers, so the frame can be captured), and a "Stats for nerds"
 * panel (resolution, bitrate, buffer, latency, dropped frames).
 */
const MAX_RETRIES = 5;
// A fragment is "slow" when it takes longer to download than it plays.
const SLOW_FRAG_COUNT = 2;
// Close enough to the live edge to count as "LIVE".
const LIVE_EDGE_SECONDS = 10;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

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
  // Live-edge + stats (video mode only).
  const [latencySec, setLatencySec] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<{
    resolution: string;
    bitrate: string;
    bufferSec: string;
    dropped: string;
  }>({ resolution: "—", bitrate: "—", bufferSec: "—", dropped: "—" });
  const [pipActive, setPipActive] = useState(false);
  const [shotMsg, setShotMsg] = useState<string | null>(null);

  const toggleSubs = () => {
    const hls = hlsRef.current;
    if (!hls || !subsAvailable) return;
    const next = !subsOn;
    hls.subtitleTrack = next ? 0 : -1;
    setSubsOn(next);
  };

  /** Seconds behind the live edge, or null when unknown. */
  const getLatency = (): number | null => {
    const media = mediaRef.current;
    if (!media) return null;
    const hls = hlsRef.current;
    if (hls) {
      const edge = hls.liveSyncPosition;
      if (typeof edge === "number" && isFinite(edge)) {
        return Math.max(0, edge - media.currentTime);
      }
      return null;
    }
    // Safari native HLS: use the end of the seekable range as the edge.
    if (media.seekable.length > 0) {
      const edge = media.seekable.end(media.seekable.length - 1);
      return Math.max(0, edge - media.currentTime);
    }
    return null;
  };

  const jumpToLive = () => {
    const media = mediaRef.current;
    if (!media) return;
    const hls = hlsRef.current;
    if (hls && typeof hls.liveSyncPosition === "number" && isFinite(hls.liveSyncPosition)) {
      media.currentTime = hls.liveSyncPosition;
    } else if (media.seekable.length > 0) {
      media.currentTime = media.seekable.end(media.seekable.length - 1);
    }
    media.play().catch(() => undefined);
  };

  const changeSpeed = (rate: number) => {
    const media = mediaRef.current;
    if (!media) return;
    media.playbackRate = rate;
    setSpeed(rate);
  };

  const togglePip = async () => {
    const media = mediaRef.current as HTMLVideoElement | null;
    if (!media) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (media.requestPictureInPicture) {
        await media.requestPictureInPicture();
      }
    } catch {
      // PiP unsupported or rejected — nothing to do.
    }
  };

  const takeScreenshot = () => {
    const media = mediaRef.current as HTMLVideoElement | null;
    if (!media || !media.videoWidth) {
      setShotMsg("No video frame to capture yet.");
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = media.videoWidth;
      canvas.height = media.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          setShotMsg("Screenshot failed.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        a.href = url;
        a.download = `${channel}-${stamp}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setShotMsg("Screenshot saved.");
        setTimeout(() => setShotMsg(null), 3000);
      }, "image/png");
    } catch {
      setShotMsg("Screenshot blocked by the browser (CORS).");
      setTimeout(() => setShotMsg(null), 3000);
    }
  };

  // Live-edge latency + stats, refreshed once a second (video mode only).
  useEffect(() => {
    if (audioOnly) return;
    const id = setInterval(() => {
      const media = mediaRef.current;
      if (!media) return;
      setLatencySec(getLatency());
      if (!showStats) return;
      const hls = hlsRef.current;
      let bitrate = "—";
      if (hls && hls.levels.length > 0) {
        const lvl = hls.levels[hls.currentLevel] ?? hls.levels[0];
        if (lvl?.bitrate) bitrate = `${(lvl.bitrate / 1_000_000).toFixed(1)} Mbps`;
      }
      let bufferSec = "—";
      if (media.buffered.length > 0) {
        const end = media.buffered.end(media.buffered.length - 1);
        bufferSec = `${Math.max(0, end - media.currentTime).toFixed(1)}s`;
      }
      const q = (media as HTMLVideoElement).getVideoPlaybackQuality?.();
      const video = media as HTMLVideoElement;
      setStats({
        resolution:
          video.videoWidth && video.videoHeight
            ? `${video.videoWidth}×${video.videoHeight}`
            : "—",
        bitrate,
        bufferSec,
        dropped: q ? String(q.droppedVideoFrames) : "—",
      });
    }, 1000);
    return () => clearInterval(id);
  }, [audioOnly, showStats]);

  // Track picture-in-picture state.
  useEffect(() => {
    const media = mediaRef.current as HTMLVideoElement | null;
    if (!media) return;
    const onEnter = () => setPipActive(true);
    const onLeave = () => setPipActive(false);
    media.addEventListener("enterpictureinpicture", onEnter);
    media.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      media.removeEventListener("enterpictureinpicture", onEnter);
      media.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, [audioOnly]);

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
    setLatencySec(null);
    setSpeed(1);
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

    // Resuming after a pause can leave the player far behind the live edge:
    // the segments at that position have already expired from the live
    // playlist, so playing them stalls into a reconnect loop that only a
    // page refresh fixes. Jump to the live edge instead.
    const onPlay = () => {
      if (media.currentTime > 0) {
        const lat = getLatency();
        if (lat !== null && lat > 30) {
          jumpToLive();
        }
      }
    };
    media.addEventListener("play", onPlay);

    const initHls = () => {
      if (stopped) return;
      // Small buffer now that streams are stable through the Cloudflare
      // Worker proxy (unmetered, no Vercel bottleneck): less delay behind
      // live (~18s instead of ~36s) and less memory held. The auto-retry
      // + slow-detection still cover any hiccup.
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
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
        // If the media is stuck at a stale position (e.g. after a long
        // pause the live playlist moved on and those segments expired),
        // seek to the live edge instead of replaying expired segments —
        // otherwise the player loops through fatal errors and only a
        // page refresh recovers it.
        if (
          media.currentTime > 0 &&
          typeof hls.liveSyncPosition === "number" &&
          isFinite(hls.liveSyncPosition) &&
          media.currentTime < hls.liveSyncPosition - 30
        ) {
          media.currentTime = hls.liveSyncPosition;
        }
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
        media.removeEventListener("play", onPlay);
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
        media.removeEventListener("play", onPlay);
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

  const isLive = latencySec !== null && latencySec <= LIVE_EDGE_SECONDS;
  const behind = latencySec !== null && latencySec > LIVE_EDGE_SECONDS;

  return (
    <div className="w-full">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <video
          ref={(el) => {
            mediaRef.current = el;
          }}
          className="h-full w-full"
          controls
          playsInline
          crossOrigin="anonymous"
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
              className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-amber-300 hover:bg-amber-900"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
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

      {/* Player extras: live edge, speed, PiP, screenshot, stats. */}
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-bold ${
            isLive ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-300"
          }`}
          title={isLive ? "You are at the live edge" : "You are behind the live edge"}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "animate-pulse bg-white" : "bg-zinc-400"}`} />
          {isLive ? "LIVE" : latencySec !== null ? `${Math.round(latencySec)}s behind live` : "LIVE"}
        </span>
        {behind && (
          <button
            type="button"
            onClick={jumpToLive}
            className="rounded bg-red-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-600"
          >
            Jump to live
          </button>
        )}
        <label className="ml-1 flex items-center gap-1.5 text-xs text-zinc-400">
          Speed
          <select
            value={speed}
            onChange={(e) => changeSpeed(Number(e.target.value))}
            className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-xs text-white"
            aria-label="Playback speed"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s === 1 ? "1×" : `${s}×`}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={takeScreenshot}
            aria-label="Save the current frame as a PNG"
            title="Save the current frame as a PNG"
            className="inline-flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden="true" /> Screenshot
          </button>
          <button
            type="button"
            onClick={togglePip}
            aria-pressed={pipActive}
            title={pipActive ? "Exit picture-in-picture" : "Picture-in-picture"}
            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium ${
              pipActive
                ? "border-red-700 bg-red-700 text-white"
                : "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            <PictureInPicture2 className="h-3.5 w-3.5" aria-hidden="true" /> PiP
          </button>
          <button
            type="button"
            onClick={() => setShowStats((v) => !v)}
            aria-pressed={showStats}
            title="Show stream stats (resolution, bitrate, buffer, latency)"
            className={`rounded border px-2.5 py-1 text-xs font-medium ${
              showStats
                ? "border-red-700 bg-red-700 text-white"
                : "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            Stats
          </button>
        </div>
      </div>
      {shotMsg && (
        <p className="mt-1.5 text-xs text-zinc-400">{shotMsg}</p>
      )}
      {showStats && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs sm:grid-cols-4">
          <p><span className="text-zinc-500">Resolution: </span><span className="text-zinc-200">{stats.resolution}</span></p>
          <p><span className="text-zinc-500">Bitrate: </span><span className="text-zinc-200">{stats.bitrate}</span></p>
          <p><span className="text-zinc-500">Buffer: </span><span className="text-zinc-200">{stats.bufferSec}</span></p>
          <p><span className="text-zinc-500">Behind live: </span><span className="text-zinc-200">{latencySec !== null ? `${Math.round(latencySec)}s` : "—"}</span></p>
          <p><span className="text-zinc-500">Dropped frames: </span><span className="text-zinc-200">{stats.dropped}</span></p>
          <p><span className="text-zinc-500">Speed: </span><span className="text-zinc-200">{speed}×</span></p>
          <p><span className="text-zinc-500">Channel: </span><span className="text-zinc-200">{channel}</span></p>
          <p><span className="text-zinc-500">Source: </span><span className="text-zinc-200">{(process.env.NEXT_PUBLIC_HLS_PROXY || "").replace(/\/$/, "") ? "Cloudflare Worker" : "Vercel /api/hls"}</span></p>
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-zinc-500">
        Shortcuts (when the video is focused): Space play/pause · F fullscreen · M mute · Left/Right seek · Up/Down volume.
      </p>
    </div>
  );
}

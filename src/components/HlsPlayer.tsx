"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

/**
 * Live TV player. The video element is fed ONLY our own HLS proxy
 * (/api/hls/<channel>/index.m3u8) — the browser never touches the CDN.
 */
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    setLoading(true);
    const src = `/api/hls/${channel}/index.m3u8`;

    const onError = () => {
      setError("Stream is currently unavailable. Please try again later.");
      setLoading(false);
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari: native HLS
      video.src = src;
      video.play().catch(() => undefined);
      const onCanPlay = () => setLoading(false);
      video.addEventListener("canplay", onCanPlay);
      video.addEventListener("error", onError);
      return () => {
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("error", onError);
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        liveSyncDurationCount: 3,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
            return;
          }
          setError("Stream is currently unavailable. Please try again later.");
          setLoading(false);
        }
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    setError("Your browser cannot play live HLS streams.");
    setLoading(false);
  }, [channel]);

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
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-zinc-300">
          Connecting to live stream…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-6 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <p className="text-xs text-zinc-400">
            The channel may be off air right now. Check the programme guide for broadcast hours.
          </p>
        </div>
      )}
    </div>
  );
}

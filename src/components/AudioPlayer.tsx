"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

/** Radio player: HLS audio through our own proxy, same as TV. */
export default function AudioPlayer({ channel, label }: { channel: string; label: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    const src = `/api/hls/${channel}/index.m3u8`;

    if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      audio.src = src;
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30 });
      hls.loadSource(src);
      hls.attachMedia(audio);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setError("This station is currently unavailable.");
      });
      return () => hls.destroy();
    }
    setError("Your browser cannot play this audio stream.");
  }, [channel]);

  return (
    <div>
      <audio ref={audioRef} controls preload="none" className="w-full" aria-label={label} />
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}

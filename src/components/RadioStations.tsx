"use client";

import { useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import { RADIO_STATIONS } from "@/lib/types";

/** Radio station grid: only one station plays at a time, and the playing
    station's card is highlighted with a "Now playing" banner on top. */
export default function RadioStations() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playing = RADIO_STATIONS.find((s) => s.id === playingId) ?? null;

  return (
    <div className="space-y-5">
      {playing && (
        <div className="flex items-center gap-3 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <p className="text-sm text-red-200">
            <span className="font-bold uppercase tracking-wide">Now playing: </span>
            {playing.name} <span className="text-red-300/70">({playing.korean})</span>
          </p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {RADIO_STATIONS.map((s) => {
          const isActive = playingId === s.id;
          return (
            <div
              key={s.id}
              className={`rounded-xl border p-5 transition-colors ${
                isActive
                  ? "border-red-700 bg-red-950/20 shadow-[0_0_24px_rgba(220,38,38,0.15)]"
                  : "border-zinc-800 bg-zinc-900/60"
              }`}
            >
              <h2 className="font-semibold text-zinc-100">{s.name}</h2>
              <p className="text-sm text-zinc-500">{s.korean}</p>
              <div className="mt-4">
                <AudioPlayer
                  channel={s.hls}
                  label={s.name}
                  active={isActive}
                  onToggle={(channel) => setPlayingId(channel)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

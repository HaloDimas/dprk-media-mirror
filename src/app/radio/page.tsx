import AudioPlayer from "@/components/AudioPlayer";
import { RADIO_STATIONS } from "@/lib/types";

export const metadata = {
  title: "Radio — DPRK Media Mirror",
  description: "KCBS, KCBS-2 and Pyongyang FM, streaming live on this site.",
};

export default function RadioPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Radio</h1>
        <p className="mt-1 text-sm text-zinc-400">
          North Korean radio stations, streaming live in this site&apos;s own audio player.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {RADIO_STATIONS.map((s) => (
          <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="font-semibold text-zinc-100">{s.name}</h2>
            <p className="text-sm text-zinc-500">{s.korean}</p>
            <div className="mt-4">
              <AudioPlayer channel={s.hls} label={s.name} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        Streams are served through this site&apos;s own audio proxy. If a station is silent, it may be off
        air at this hour.
      </p>
    </div>
  );
}

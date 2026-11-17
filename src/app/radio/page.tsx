import RadioStations from "@/components/RadioStations";

export const metadata = {
  title: "Radio — DPRK Media Mirror",
  description: "KCBS, KCBS-2 and Pyongyang FM, streaming live on this site.",
};

export default function RadioPage() {
  return (
    // pb-28: room for the fixed Now Playing bar so it never covers the footer.
    <div className="space-y-6 pb-28">
      <div>
        <h1 className="text-xl font-bold text-white">Radio</h1>
        <p className="mt-1 text-sm text-zinc-400">
          North Korean radio stations, streaming live in this site&apos;s own audio player.
          Press play on one station — starting another pauses the first.
        </p>
      </div>
      <RadioStations />
      <p className="text-xs text-zinc-500">
        Streams are served through this site&apos;s own audio proxy. If a station is silent, it may be off
        air at this hour.
      </p>
    </div>
  );
}

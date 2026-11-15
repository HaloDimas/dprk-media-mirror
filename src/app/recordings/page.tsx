import RecordingsBrowser from "@/components/RecordingsBrowser";
import { getRecordings } from "@/lib/sources";


export default async function RecordingsPage() {
  const items = await getRecordings();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Recordings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          The KCTV broadcast archive — 8pm News editions, Revolutionary Activities and Society &amp;
          Culture programmes. Watch them in this site&apos;s own video player.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-400">
          Recordings are temporarily unavailable. Please try again later.
        </p>
      ) : (
        <RecordingsBrowser items={items} />
      )}
    </div>
  );
}

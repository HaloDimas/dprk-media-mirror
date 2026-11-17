import RecordingsBrowser from "@/components/RecordingsBrowser";
import { getRecordings } from "@/lib/sources";
import { T } from "@/i18n/T";


export default async function RecordingsPage() {
  const items = await getRecordings();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          <T k="recordings.title" />
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          <T k="recordings.intro" />
        </p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-sm text-zinc-600 dark:text-zinc-400">
          <T k="recordings.unavailable" />
        </p>
      ) : (
        <RecordingsBrowser items={items} />
      )}
    </div>
  );
}

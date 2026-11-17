import { Spinner } from "@/components/LoadingScreen";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
      <Spinner labelKey="loading.schedule" />
      <div className="mt-8 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-3"
          >
            <div className="h-4 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-4 flex-1 rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </main>
  );
}

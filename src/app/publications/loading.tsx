import { SkeletonCard, Spinner } from "@/components/LoadingScreen";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-zinc-800" />
      </div>
      <Spinner label="Loading publications..." />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </main>
  );
}

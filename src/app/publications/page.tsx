import { connection } from "next/server";
import PublicationsBrowser from "@/components/PublicationsBrowser";
import { getPeriodicals, getPublications, getStamps } from "@/lib/sources";
import { T } from "@/i18n/T";

// This page depends on live .kp data (the Korean Stamp homepage is fetched
// over plain HTTP with retries), so it renders at request time, like the
// News page — otherwise prerendering fails with uncached/runtime data.
export const instant = false;

export default async function PublicationsPage() {
  await connection();
  const [publications, periodicals, stamps] = await Promise.all([
    getPublications(),
    getPeriodicals(),
    getStamps(),
  ]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          <T k="publications.title" />
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          <T k="publications.intro" />
        </p>
      </div>
      {publications.length === 0 && periodicals.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-sm text-zinc-600 dark:text-zinc-400">
          <T k="publications.unavailable" />
        </p>
      ) : (
        <PublicationsBrowser publications={publications} periodicals={periodicals} stamps={stamps} />
      )}
    </div>
  );
}

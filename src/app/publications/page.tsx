import { connection } from "next/server";
import PublicationsBrowser from "@/components/PublicationsBrowser";
import { getPeriodicals, getPublications, getStamps } from "@/lib/sources";

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
        <h1 className="text-xl font-bold text-white">Publications</h1>
        <p className="mt-1 text-sm text-zinc-400">
          The Pyongyang Times and DPR Korea newspapers, plus Kumsugangsan periodicals. Covers are served
          from this site, and every PDF opens in this site&apos;s own viewer or downloads through this
          site&apos;s file proxy.
        </p>
      </div>
      {publications.length === 0 && periodicals.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-400">
          Publications are temporarily unavailable. Please try again later.
        </p>
      ) : (
        <PublicationsBrowser publications={publications} periodicals={periodicals} stamps={stamps} />
      )}
    </div>
  );
}

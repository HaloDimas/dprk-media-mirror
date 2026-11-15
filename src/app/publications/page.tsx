import PublicationsBrowser from "@/components/PublicationsBrowser";
import { getPeriodicals, getPublications } from "@/lib/sources";


export default async function PublicationsPage() {
  const [publications, periodicals] = await Promise.all([getPublications(), getPeriodicals()]);
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
        <PublicationsBrowser publications={publications} periodicals={periodicals} />
      )}
    </div>
  );
}

import Link from "next/link";
import { connection } from "next/server";
import NewsSearch from "@/components/NewsSearch";
import { getAllNews } from "@/lib/sources";

// This page depends on live .kp data (Rodong's homepage is ~4MB, over Next.js's
// 2MB data-cache limit), so it renders at request time, like the home page.
export const instant = false;

export default async function NewsPage() {
  await connection();
  const items = await getAllNews();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">News</h1>
        <p className="mt-1 text-sm text-zinc-400">
          KCNA, Rodong Sinmun, Minju Joson, The Pyongyang Times, Naenara, Youth Sinmun, Ryugyong,
          Voice of Korea and Korean Architecture — read in full on this site where the full text can
          be fetched — together with KNS full text and KCNA Watch articles, which now open in full
          while the mirror&apos;s KCNA Watch session is live.
        </p>
        <p className="mt-2">
          <Link
            href="/news/archive"
            className="inline-block rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Browse the full archive — search 1.37M KCNA Watch articles →
          </Link>
        </p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-400">
          News is temporarily unavailable. Please try again later.
        </p>
      ) : (
        <NewsSearch items={items} />
      )}
    </div>
  );
}

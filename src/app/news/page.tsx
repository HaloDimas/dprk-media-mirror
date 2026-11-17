import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { connection } from "next/server";
import NewsSearch from "@/components/NewsSearch";
import { SkeletonRow } from "@/components/LoadingScreen";
import { getAllNews } from "@/lib/sources";
import { T } from "@/i18n/T";

// This page depends on live .kp data (Rodong's homepage is ~4MB, over Next.js's
// 2MB data-cache limit), so it renders at request time, like the home page.
export const instant = false;

/** Article list, streamed in separately so the page header renders
 *  instantly instead of waiting up to seconds for the slow .kp sources. */
async function NewsList() {
  const items = await getAllNews();
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-sm text-zinc-600 dark:text-zinc-400">
        <T k="news.unavailable" />
      </p>
    );
  }
  return <NewsSearch items={items} />;
}

export default async function NewsPage() {
  await connection();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          <T k="news.title" />
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          <T k="news.intro" />
        </p>
        <p className="mt-2">
          <Link
            href="/news/archive"
            className="inline-block rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            <T k="news.archiveButton" />
            <ArrowRight className="ml-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
          </Link>
        </p>
      </div>
      <Suspense
        fallback={
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        }
      >
        <NewsList />
      </Suspense>
    </div>
  );
}

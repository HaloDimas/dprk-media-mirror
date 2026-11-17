import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { connection } from "next/server";
import HomeLive from "@/components/HomeLive";
import LatestNewsClient from "@/components/LatestNewsClient";
import { SkeletonRow } from "@/components/LoadingScreen";
import { T } from "@/i18n/T";
import { getAllNews, getEpg } from "@/lib/sources";
import { findNowNext, nowPyt, todayPyt } from "@/lib/types";

// This page depends on the current time, so it renders at request time.
export const instant = false;

/** Latest-news section, streamed in separately so the page does not wait
 *  for the slow .kp news sources (Rodong can take seconds). The hero and
 *  Explore sections render immediately; this fills in when ready. Rodong
 *  Sinmun is merged in on the client from /api/news-rodong, so it is
 *  never skipped. */
async function LatestNews() {
  const news = await getAllNews();
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
          <T k="home.latestNews" />
        </h2>
        <Link href="/news" className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline">
          <T k="home.allNews" /> <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <LatestNewsClient items={news} />
    </section>
  );
}

const EXPLORE: { href: string; titleKey: string; descKey: string }[] = [
  { href: "/live", titleKey: "home.exploreLiveTv", descKey: "home.exploreLiveTvDesc" },
  { href: "/schedule", titleKey: "home.exploreGuide", descKey: "home.exploreGuideDesc" },
  { href: "/radio", titleKey: "home.exploreRadio", descKey: "home.exploreRadioDesc" },
  { href: "/recordings", titleKey: "home.exploreRecordings", descKey: "home.exploreRecordingsDesc" },
  { href: "/publications", titleKey: "home.explorePublications", descKey: "home.explorePublicationsDesc" },
  { href: "/news", titleKey: "home.exploreNews", descKey: "home.exploreNewsDesc" },
  { href: "/sources", titleKey: "home.exploreSources", descKey: "home.exploreSourcesDesc" },
  { href: "/status", titleKey: "home.exploreStatus", descKey: "home.exploreStatusDesc" },
  { href: "/directory", titleKey: "home.exploreDirectory", descKey: "home.exploreDirectoryDesc" },
  { href: "/search", titleKey: "home.exploreSearch", descKey: "home.exploreSearchDesc" },
];

export default async function Home() {
  // "Today" depends on the current time, so this page renders per request.
  // Only the fast EPG is awaited here — the news streams in via Suspense.
  await connection();
  const date = todayPyt();
  const [kctv, sports, ryong] = await Promise.all([
    getEpg("kctv", date),
    getEpg("sports", date),
    getEpg("ryongnamsan", date),
  ]);
  const nowTime = nowPyt();
  const { now, next } = findNowNext(kctv.programs, nowTime);

  const channelNow = (
    [
      { id: "kctv", name: "KCTV", korean: "조선중앙텔레비죤", epg: kctv },
      { id: "sports", name: "Athletic TV", korean: "체육텔레비죤", epg: sports },
      { id: "ryongnamsan", name: "Ryongnamsan TV", korean: "룡남산텔레비죤", epg: ryong },
    ] as const
  ).map((c) => {
    const r = findNowNext(c.epg.programs, nowTime);
    return { id: c.id, name: c.name, korean: c.korean, now: r.now, next: r.next };
  });

  return (
    <div className="space-y-8">
      {/* Hero: live player + now/next + all-channels strip */}
      <HomeLive
        now={now}
        next={next}
        channelNow={channelNow}
        nowTime={nowTime}
        snapshot={kctv.source === "snapshot"}
      />

      <Suspense
        fallback={
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                <T k="home.latestNews" />
              </h2>
              <Link href="/news" className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline">
                <T k="home.allNews" /> <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </section>
        }
      >
        <LatestNews />
      </Suspense>

      <section>
        <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white">
          <T k="home.explore" />
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXPLORE.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4 hover:border-red-700 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60"
            >
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                <T k={c.titleKey} />
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                <T k={c.descKey} />
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

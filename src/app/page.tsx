import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { connection } from "next/server";
import HlsPlayer from "@/components/HlsPlayer";
import LatestNewsClient from "@/components/LatestNewsClient";
import { SkeletonRow } from "@/components/LoadingScreen";
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
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Latest News</h2>
        <Link href="/news" className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline">
          All news <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <LatestNewsClient items={news} />
    </section>
  );
}

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
    return { id: c.id, name: c.name, korean: c.korean, now: r.now?.en ?? null, next: r.next?.en ?? null };
  });

  return (
    <div className="space-y-8">
      {/* Hero: live player + now/next + all-channels strip */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">DPRK Media Mirror</h1>
          <span className="inline-flex items-center gap-1.5 rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
            Live
          </span>
          <span className="text-xs text-zinc-500">
            KCTV, radio, news, recordings and publications — all on this site · Pyongyang time {nowTime}
          </span>
          {kctv.source === "snapshot" && (
            <span className="text-xs text-amber-700 dark:text-amber-300">Guide snapshot — live guide unreachable</span>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <HlsPlayer channel="kctv" title="KCTV Live" />
            <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 px-4 py-3 text-sm">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                KCTV Live <span className="font-normal text-zinc-500">· 조선중앙텔레비죤</span>
              </p>
              {now ? (
                <p className="mt-1">
                  <span className="font-semibold text-red-600 dark:text-red-400">Now:</span>{" "}
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {now.en} <span className="text-zinc-500">({now.start} – {now.end})</span>
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">KCTV is off air at this hour — see the schedule for broadcast times.</p>
              )}
              {next && (
                <p className="mt-1">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Next:</span>{" "}
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {next.en} <span className="text-zinc-500">({next.start} – {next.end})</span>
                  </span>
                </p>
              )}
              <p className="mt-2">
                <Link href="/schedule" className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline">
                  Full programme guide <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4">
            <h2 className="border-l-4 border-red-700 pl-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Now on all channels
            </h2>
            <ul className="mt-3 space-y-4">
              {channelNow.map((c) => (
                <li key={c.id}>
                  <Link href="/live" className="block rounded-lg p-2 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {c.name} <span className="font-normal text-zinc-500">· {c.korean}</span>
                    </p>
                    {c.now ? (
                      <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                        <span className="font-semibold text-red-600 dark:text-red-400">Now:</span> {c.now}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm text-zinc-500">Off air at this hour.</p>
                    )}
                    {c.next && <p className="text-xs text-zinc-500">Next: {c.next}</p>}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-3 text-xs text-zinc-500">
              News mirrored from 11 sources —{" "}
              <Link href="/sources" className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline">
                see all sources <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </p>
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Latest News</h2>
              <Link href="/news" className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline">
                All news <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
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
        <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white">Explore</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/live", title: "Live TV", desc: "KCTV, Athletic TV and Ryongnamsan TV, live in this site's own player." },
            { href: "/schedule", title: "Programme Guide", desc: "The full schedule for all four TV channels, by date." },
            { href: "/radio", title: "Radio", desc: "KCBS, KCBS-2 and Pyongyang FM, streaming here." },
            { href: "/recordings", title: "Recordings", desc: "8pm News, Revolutionary Activities and Society & Culture archives." },
            { href: "/publications", title: "Publications", desc: "The Pyongyang Times, DPR Korea and Kumsugangsan — read the PDFs here, plus the latest stamp issues." },
            { href: "/news", title: "News", desc: "KCNA, Rodong Sinmun, Pyongyang Times and more — in full where fetchable, plus KCNA Watch excerpts." },
            { href: "/sources", title: "Mirrored Sources", desc: "Every North Korean source mirrored here, what it provides, and its live status." },
            { href: "/status", title: "System Status", desc: "Live health of every crawler and scraper, plus the last automated refresh — the mirror maintains itself." },
            { href: "/directory", title: "Directory", desc: "51 official DPRK websites, live-checked, searchable by category and status." },
            { href: "/search", title: "Search", desc: "Search everything — news, recordings, publications, schedule and directory — with filters." },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4 hover:border-red-700 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60"
            >
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{c.title}</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

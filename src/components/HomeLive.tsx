"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import HlsPlayer from "@/components/HlsPlayer";
import { programTitle, useEpgLang } from "@/i18n/LanguageContext";
import { T } from "@/i18n/T";
import type { Program } from "@/lib/types";

export interface ChannelNow {
  id: string;
  name: string;
  korean: string;
  now: Program | null;
  next: Program | null;
}

/** Home hero: the KCTV player + now/next box, and the "Now on all
 *  channels" panel. A client component so programme titles follow the
 *  UI language (Korean UI shows the Korean title first). */
export default function HomeLive({
  now,
  next,
  channelNow,
  nowTime,
  snapshot,
}: {
  now: Program | null;
  next: Program | null;
  channelNow: ChannelNow[];
  nowTime: string;
  snapshot: boolean;
}) {
  const epgLang = useEpgLang();
  const nowTitle = now ? programTitle(now, epgLang) : null;
  const nextTitle = next ? programTitle(next, epgLang) : null;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">DPRK Media Mirror</h1>
        <span className="inline-flex items-center gap-1.5 rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
          <T k="player.live" />
        </span>
        <span className="text-xs text-zinc-500">
          <T k="home.tagline" values={{ time: nowTime }} />
        </span>
        {snapshot && (
          <span className="text-xs text-amber-700 dark:text-amber-300">
            <T k="home.guideSnapshot" />
          </span>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HlsPlayer channel="kctv" title="KCTV Live" />
          <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 px-4 py-3 text-sm">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              KCTV Live <span className="font-normal text-zinc-500">· 조선중앙텔레비죤</span>
            </p>
            {now && nowTitle ? (
              <p className="mt-1">
                <span className="font-semibold text-red-600 dark:text-red-400">
                  <T k="common.now" />:
                </span>{" "}
                <span className="text-zinc-900 dark:text-zinc-100">
                  {nowTitle.primary} <span className="text-zinc-500">({now.start} – {now.end})</span>
                </span>
                {nowTitle.secondary && (
                  <span className="block text-sm text-zinc-500">{nowTitle.secondary}</span>
                )}
              </p>
            ) : (
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                <T k="home.kctvOffAir" />
              </p>
            )}
            {next && nextTitle && (
              <p className="mt-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  <T k="common.next" />:
                </span>{" "}
                <span className="text-zinc-900 dark:text-zinc-100">
                  {nextTitle.primary} <span className="text-zinc-500">({next.start} – {next.end})</span>
                </span>
                {nextTitle.secondary && (
                  <span className="block text-sm text-zinc-500">{nextTitle.secondary}</span>
                )}
              </p>
            )}
            <p className="mt-2">
              <Link href="/schedule" className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline">
                <T k="home.fullGuide" /> <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4">
          <h2 className="border-l-4 border-red-700 pl-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <T k="home.nowOnAll" />
          </h2>
          <ul className="mt-3 space-y-4">
            {channelNow.map((c) => {
              const cNow = c.now ? programTitle(c.now, epgLang) : null;
              const cNext = c.next ? programTitle(c.next, epgLang) : null;
              return (
                <li key={c.id}>
                  <Link href="/live" className="block rounded-lg p-2 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {c.name} <span className="font-normal text-zinc-500">· {c.korean}</span>
                    </p>
                    {cNow ? (
                      <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          <T k="common.now" />:
                        </span>{" "}
                        {cNow.primary}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm text-zinc-500">
                        <T k="common.offAir" />
                      </p>
                    )}
                    {cNext && (
                      <p className="text-xs text-zinc-500">
                        <T k="common.next" />: {cNext.primary}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-3 text-xs text-zinc-500">
            <T k="home.newsFromSources" />{" "}
            <Link href="/sources" className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline">
              <T k="home.seeAllSources" /> <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

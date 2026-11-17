"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { NewsItem } from "@/lib/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { T } from "@/i18n/T";

type DateRange = "all" | "today" | "week";

export default function NewsSearch({ items }: { items: NewsItem[] }) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [source, setSource] = useState<string>("all");
  const [range, setRange] = useState<DateRange>("all");
  const [sort, setSort] = useState<"latest" | "oldest">("latest");
  // Rodong Sinmun loads in the background: the fast sources (KCNA etc.)
  // render first, then Rodong's articles are merged in when its slow server
  // finally responds. Rodong is never skipped.
  const [rodongItems, setRodongItems] = useState<NewsItem[]>([]);
  const [rodongLoading, setRodongLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/news-rodong")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: NewsItem[] } | null) => {
        if (!cancelled && d?.items) setRodongItems(d.items);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setRodongLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allItems = useMemo(() => {
    const seen = new Set<string>();
    const merged: NewsItem[] = [];
    for (const it of [...items, ...rodongItems]) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      merged.push(it);
    }
    return merged;
  }, [items, rodongItems]);

  const sourceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of allItems) map.set(it.source, (map.get(it.source) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [allItems]);

  const counts = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    return {
      today: allItems.filter((i) => i.dateValue > now - day).length,
      week: allItems.filter((i) => i.dateValue > now - 7 * day).length,
    };
  }, [allItems]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const now = Date.now();
    const day = 86400000;
    const list = allItems.filter((it) => {
      if (source !== "all" && it.source !== source) return false;
      if (range === "today" && it.dateValue < now - day) return false;
      if (range === "week" && it.dateValue < now - 7 * day) return false;
      if (needle && !it.title.toLowerCase().includes(needle) && !it.excerpt.toLowerCase().includes(needle))
        return false;
      return true;
    });
    list.sort((a, b) => (sort === "latest" ? b.dateValue - a.dateValue : a.dateValue - b.dateValue));
    return list;
  }, [allItems, q, source, range, sort]);

  const rangeLabels: [DateRange, string][] = [
    ["all", t("news.allDates")],
    ["today", t("news.today", { n: counts.today })],
    ["week", t("news.thisWeek", { n: counts.week })],
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("news.searchPlaceholder")} aria-label={t("news.searchAria")}
          className="min-w-56 flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
        />
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <T k="news.source" />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-2 text-sm text-zinc-900 dark:text-zinc-100"
          >
            <option value="all">
              <T k="news.allSources" values={{ n: allItems.length }} />
            </option>
            {sourceCounts.map(([s, n]) => (
              <option key={s} value={s}>
                {s} ({n})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="group" aria-label={t("news.dateRange")}>
          {rangeLabels.map(([r, label]) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                range === r ? "bg-red-700 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <T k="news.sort" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "latest" | "oldest")}
            className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
          >
            <option value="latest">
              <T k="news.latestFirst" />
            </option>
            <option value="oldest">
              <T k="news.oldestFirst" />
            </option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        <T k="news.countOf" values={{ shown: filtered.length, total: allItems.length }} />{" "}
        <T k="news.explainer" />
        {rodongLoading && (
          <span className="ml-2 text-zinc-600 dark:text-zinc-400">
            <T k="news.loadingRodong" />
          </span>
        )}
      </p>

      <ul className="mt-4 space-y-3">
        {filtered.map((it) => (
          <li
            key={it.id}
            className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 transition-colors hover:border-red-800"
          >
            <Link href={`/news/${it.id}`} className="flex gap-4 p-4 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
              {it.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" className="hidden h-20 w-28 shrink-0 rounded-md object-cover sm:block" />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-300">{it.source}</span>
                  <span className="text-zinc-500">{it.date}</span>
                  {it.kind === "excerpt" && (
                    <span className="rounded bg-amber-100 dark:bg-amber-900/70 px-2 py-0.5 text-amber-800 dark:text-amber-200">
                      <T k="news.excerptOnly" />
                    </span>
                  )}
                </div>
                <h2 className="mt-1 font-medium leading-snug text-zinc-900 dark:text-zinc-100">{it.title}</h2>
                {it.excerpt && <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{it.excerpt}</p>}
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            <T k="news.noMatch" />
          </li>
        )}
      </ul>
    </div>
  );
}

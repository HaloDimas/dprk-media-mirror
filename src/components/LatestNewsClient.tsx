"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { NewsItem } from "@/lib/types";
import { T } from "@/i18n/T";

/** Home-page "Latest News" (top 6). The fast sources render first; Rodong
 *  Sinmun is merged in from /api/news-rodong when its slow server responds,
 *  so Rodong is never skipped. */
export default function LatestNewsClient({ items }: { items: NewsItem[] }) {
  const [rodongItems, setRodongItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/news-rodong")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: NewsItem[] } | null) => {
        if (!cancelled && d?.items) setRodongItems(d.items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = useMemo(() => {
    const seen = new Set<string>();
    const merged: NewsItem[] = [];
    for (const it of [...items, ...rodongItems]) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      merged.push(it);
    }
    merged.sort((a, b) => b.dateValue - a.dateValue);
    return merged.slice(0, 6);
  }, [items, rodongItems]);

  if (latest.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-sm text-zinc-600 dark:text-zinc-400">
        <T k="news.unavailable" />
      </p>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {latest.map((it) => (
        <li key={it.id} className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60">
          <Link href={`/news/${it.id}`} className="flex gap-3 p-4 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
            {it.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.image} alt="" className="hidden h-16 w-24 shrink-0 rounded-md object-cover sm:block" />
            )}
            <div className="min-w-0">
              <div className="flex gap-2 text-xs">
                <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-300">{it.source}</span>
                <span className="text-zinc-500">{it.date}</span>
              </div>
              <h3 className="mt-1 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{it.title}</h3>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

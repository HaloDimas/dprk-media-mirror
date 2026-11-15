"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NewsItem } from "@/lib/types";

type DateRange = "all" | "today" | "week";

export default function NewsSearch({ items }: { items: NewsItem[] }) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState<string>("all");
  const [range, setRange] = useState<DateRange>("all");
  const [sort, setSort] = useState<"latest" | "oldest">("latest");

  const sourceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) map.set(it.source, (map.get(it.source) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const counts = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    return {
      today: items.filter((i) => i.dateValue > now - day).length,
      week: items.filter((i) => i.dateValue > now - 7 * day).length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const now = Date.now();
    const day = 86400000;
    const list = items.filter((it) => {
      if (source !== "all" && it.source !== source) return false;
      if (range === "today" && it.dateValue < now - day) return false;
      if (range === "week" && it.dateValue < now - 7 * day) return false;
      if (needle && !it.title.toLowerCase().includes(needle) && !it.excerpt.toLowerCase().includes(needle))
        return false;
      return true;
    });
    list.sort((a, b) => (sort === "latest" ? b.dateValue - a.dateValue : a.dateValue - b.dateValue));
    return list;
  }, [items, q, source, range, sort]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search headlines…"
          className="min-w-56 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Source
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
          >
            <option value="all">All sources ({items.length})</option>
            {sourceCounts.map(([s, n]) => (
              <option key={s} value={s}>
                {s} ({n})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="group" aria-label="Date range">
          {(
            [
              ["all", "All dates"],
              ["today", `Today (${counts.today})`],
              ["week", `This week (${counts.week})`],
            ] as [DateRange, string][]
          ).map(([r, label]) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                range === r ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "latest" | "oldest")}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          >
            <option value="latest">Latest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        {filtered.length} of {items.length} articles. KNS, KCNA, Rodong Sinmun, Pyongyang Times, Voice
        of Korea and Korean Architecture articles open in full on this site. KCNA Watch articles open
        in full while the mirror&apos;s KCNA Watch session is live — if the session has expired, the
        excerpt is shown instead. Minju Joson, Naenara, Youth Sinmun and Ryugyong items show the
        headline and date — their article pages cannot be fetched (see each article page for why).
      </p>

      <ul className="mt-4 space-y-3">
        {filtered.map((it) => (
          <li
            key={it.id}
            className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 transition-colors hover:border-red-800"
          >
            <Link href={`/news/${it.id}`} className="flex gap-4 p-4 hover:bg-zinc-800/50">
              {it.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" className="hidden h-20 w-28 shrink-0 rounded-md object-cover sm:block" />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{it.source}</span>
                  <span className="text-zinc-500">{it.date}</span>
                  {it.kind === "excerpt" && (
                    <span className="rounded bg-amber-900/70 px-2 py-0.5 text-amber-200">Excerpt only</span>
                  )}
                </div>
                <h2 className="mt-1 font-medium leading-snug text-zinc-100">{it.title}</h2>
                {it.excerpt && <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{it.excerpt}</p>}
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400">
            No articles match your filters.
          </li>
        )}
      </ul>
    </div>
  );
}

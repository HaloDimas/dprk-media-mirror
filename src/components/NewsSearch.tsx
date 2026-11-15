"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NewsItem } from "@/lib/types";

export default function NewsSearch({ items }: { items: NewsItem[] }) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState<"all" | "KNS" | "KCNA Watch">("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(
      (it) =>
        (source === "all" || it.source === source) &&
        (!needle || it.title.toLowerCase().includes(needle) || it.excerpt.toLowerCase().includes(needle))
    );
  }, [items, q, source]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search headlines…"
          className="min-w-56 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
        />
        {(["all", "KNS", "KCNA Watch"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              source === s ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {s === "all" ? "All sources" : s}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        {filtered.length} of {items.length} articles. KNS articles open in full on this site. KCNA Watch
        items show the published excerpt — the full text requires a free KCNA Watch account and cannot be
        mirrored here.
      </p>

      <ul className="mt-4 space-y-3">
        {filtered.map((it) => (
          <li key={it.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
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
            No articles match your search.
          </li>
        )}
      </ul>
    </div>
  );
}

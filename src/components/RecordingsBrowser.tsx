"use client";

import { useMemo, useState } from "react";
import type { RecordingItem } from "@/lib/types";

const CATS = [
  { id: "all", label: "All recordings" },
  { id: "news", label: "8pm News" },
  { id: "activities", label: "Revolutionary Activities" },
  { id: "society", label: "Society & Culture" },
] as const;

const CAT_LABEL: Record<string, string> = {
  news: "8pm News",
  activities: "Revolutionary Activities",
  society: "Society & Culture",
};

export default function RecordingsBrowser({ items }: { items: RecordingItem[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [playing, setPlaying] = useState<RecordingItem | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, news: 0, activities: 0, society: 0 };
    for (const it of items) c[it.category] = (c[it.category] ?? 0) + 1;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter((it) => {
      if (cat !== "all" && it.category !== cat) return false;
      if (from && it.date < from) return false;
      if (to && it.date > to) return false;
      if (needle && !it.title.toLowerCase().includes(needle) && !it.date.includes(needle)) return false;
      return true;
    });
    list.sort((a, b) => (sort === "newest" ? (a.date < b.date ? 1 : -1) : a.date < b.date ? -1 : 1));
    return list;
  }, [items, q, cat, from, to, sort]);

  return (
    <div>
      {playing && (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-zinc-100">{playing.title}</h2>
              <p className="text-xs text-zinc-500">{playing.date}</p>
            </div>
            <button
              onClick={() => setPlaying(null)}
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Close player
            </button>
          </div>
          <video key={playing.slug} src={playing.url} controls autoPlay playsInline className="aspect-video w-full rounded-lg bg-black" />
          <p className="mt-2 text-xs text-zinc-500">
            Playing in this site&apos;s own video player. The video file itself is hosted on the source&apos;s
            file storage — no page on the source site is opened.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search recordings…" aria-label="Search recordings"
          className="min-w-56 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
        />
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              cat === c.id ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {c.label}
            <span className="ml-1.5 text-xs opacity-70">{counts[c.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="min-w-0 max-w-full truncate rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 [color-scheme:dark]"
          />
        </label>
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="min-w-0 max-w-full truncate rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 [color-scheme:dark]"
          />
        </label>
        <label className="ml-auto flex min-w-0 items-center gap-2 text-xs text-zinc-400">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            className="min-w-0 max-w-full truncate rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        {(from || to) && (
          <button
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            Clear dates
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        {filtered.length} of {items.length} recordings · 8pm News {counts.news} · Revolutionary Activities{" "}
        {counts.activities} · Society &amp; Culture {counts.society}
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((it) => (
          <li
            key={it.slug}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-red-800"
          >
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
              {CAT_LABEL[it.category]}
            </span>
            <h2 className="mt-2 text-sm font-medium leading-snug text-zinc-100">{it.title}</h2>
            <p className="mt-1 text-xs text-zinc-500">{it.date}</p>
            <button
              onClick={() => setPlaying(it)}
              className="mt-3 w-full rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              ▶ Watch here
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400 sm:col-span-2 lg:col-span-3">
            No recordings match your filters.
          </li>
        )}
      </ul>
    </div>
  );
}

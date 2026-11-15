"use client";

import { useMemo, useState } from "react";
import type { RecordingItem } from "@/lib/types";

const CATS = [
  { id: "all", label: "All recordings" },
  { id: "news", label: "8pm News" },
  { id: "activities", label: "Revolutionary Activities" },
  { id: "society", label: "Society & Culture" },
] as const;

export default function RecordingsBrowser({ items }: { items: RecordingItem[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("all");
  const [playing, setPlaying] = useState<RecordingItem | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(
      (it) =>
        (cat === "all" || it.category === cat) &&
        (!needle || it.title.toLowerCase().includes(needle) || it.date.includes(needle))
    );
  }, [items, q, cat]);

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
          placeholder="Search recordings…"
          className="min-w-56 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
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
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        {filtered.length} of {items.length} recordings.
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((it) => (
          <li key={it.slug} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
              {it.category === "news" ? "8pm News" : it.category === "activities" ? "Revolutionary Activities" : "Society & Culture"}
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
            No recordings match your search.
          </li>
        )}
      </ul>
    </div>
  );
}

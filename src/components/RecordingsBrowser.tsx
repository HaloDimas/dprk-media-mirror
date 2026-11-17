"use client";

import { useCallback, useMemo, useState } from "react";
import { Play } from "lucide-react";
import type { RecordingItem } from "@/lib/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { T } from "@/i18n/T";

const CATS = [
  { id: "all", key: "recordings.allRecordings" },
  { id: "news", key: "recordings.news8pm" },
  { id: "activities", key: "recordings.activities" },
  { id: "society", key: "recordings.society" },
] as const;

const CAT_KEY: Record<string, string> = {
  news: "recordings.news8pm",
  activities: "recordings.activities",
  society: "recordings.society",
};

const CAT_DESC_KEY: Record<string, string> = {
  news: "recordings.newsDesc",
  activities: "recordings.activitiesDesc",
  society: "recordings.societyDesc",
};

/** One Juche-style VOD card: 16:9 thumbnail on top, then title (max 2
 *  lines), date and a Watch button. Clicking the thumbnail plays the
 *  video too. A thumbnail that fails to load is replaced by a dark tile
 *  with a Play icon — never a broken-image icon. */
function RecordingCard({ it, onPlay }: { it: RecordingItem; onPlay: (it: RecordingItem) => void }) {
  const [thumbError, setThumbError] = useState(false);
  // An image that fails before hydration never fires onError (no listener
  // is attached yet). The ref callback runs at commit time and catches
  // images that already finished loading with an error.
  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setThumbError(true);
  }, []);
  const showThumb = !thumbError && Boolean(it.thumb);
  return (
    <li className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 transition-colors hover:border-red-800">
      <button
        type="button"
        onClick={() => onPlay(it)}
        aria-label={it.title}
        className="group relative block aspect-video w-full cursor-pointer overflow-hidden bg-zinc-900"
      >
        {showThumb ? (
          <img
            ref={imgRef}
            src={it.thumb}
            alt={it.title}
            loading="lazy"
            onError={() => setThumbError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-zinc-900">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-700 text-white">
              <Play className="h-5 w-5" fill="currentColor" aria-hidden="true" />
            </span>
          </span>
        )}
        {showThumb && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity duration-200 group-hover:bg-black/30 group-hover:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-700/90 text-white shadow-lg">
              <Play className="h-5 w-5" fill="currentColor" aria-hidden="true" />
            </span>
          </span>
        )}
      </button>
      <div className="p-4">
        <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-700 dark:text-zinc-300">
          <T k={CAT_KEY[it.category]} />
        </span>
        <h2 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{it.title}</h2>
        <p className="mt-1 text-xs text-zinc-500">{it.date}</p>
        <button
          onClick={() => onPlay(it)}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
        >
          <Play className="h-4 w-4" fill="currentColor" aria-hidden="true" /> <T k="recordings.watchHere" />
        </button>
      </div>
    </li>
  );
}

export default function RecordingsBrowser({ items }: { items: RecordingItem[] }) {
  const { t } = useLanguage();
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
        <div className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 p-4">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{playing.title}</h2>
              <p className="text-xs text-zinc-500">{playing.date}</p>
            </div>
            <button
              onClick={() => setPlaying(null)}
              className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <T k="recordings.closePlayer" />
            </button>
          </div>
          <video key={playing.slug} src={playing.url} controls autoPlay playsInline className="aspect-video w-full rounded-lg bg-black" />
          <p className="mt-2 text-xs text-zinc-500">
            <T k="recordings.playingNote" />
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("recordings.searchPlaceholder")} aria-label={t("recordings.searchAria")}
          className="min-w-56 flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
        />
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              cat === c.id ? "bg-red-700 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            <T k={c.key} />
            <span className="ml-1.5 text-xs opacity-70">{counts[c.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <T k="recordings.from" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </label>
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <T k="recordings.to" />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </label>
        <label className="ml-auto flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <T k="recordings.sort" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
          >
            <option value="newest">
              <T k="recordings.newestFirst" />
            </option>
            <option value="oldest">
              <T k="recordings.oldestFirst" />
            </option>
          </select>
        </label>
        {(from || to) && (
          <button
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <T k="recordings.clearDates" />
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        <T
          k="recordings.countsLine"
          values={{ shown: filtered.length, total: items.length, news: counts.news, activities: counts.activities, society: counts.society }}
        />
      </p>

      {cat !== "all" && (
        <div className="mt-6">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            <T k={CAT_KEY[cat]} />
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
            <T k={CAT_DESC_KEY[cat]} />
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            <T k="recordings.videosCount" values={{ count: filtered.length }} />
          </p>
        </div>
      )}

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((it) => (
          <RecordingCard key={it.slug} it={it} onPlay={setPlaying} />
        ))}
        {filtered.length === 0 && (
          <li className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400 sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <T k="recordings.noMatch" />
          </li>
        )}
      </ul>
    </div>
  );
}

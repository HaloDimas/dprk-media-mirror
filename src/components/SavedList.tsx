"use client";

import Link from "next/link";
import { Bookmark, Trash2, X } from "lucide-react";
import { useSaved } from "@/lib/saved";
import { useLanguage } from "@/i18n/LanguageContext";
import { T } from "@/i18n/T";

/** /saved list — everything bookmarked, newest saved first, grouped
 *  by type. Items link back to their article page / the recordings
 *  list; each has a remove button, plus Clear all. localStorage-only. */
export default function SavedList() {
  const { t } = useLanguage();
  const { items, remove, clear } = useSaved();

  const articles = items.filter((it) => it.type === "article");
  const recordings = items.filter((it) => it.type === "recording");

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-8 text-center">
        <Bookmark className="mx-auto h-8 w-8 text-zinc-400" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <T k="saved.empty" />
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          <T k="saved.emptyHint" />
        </p>
      </div>
    );
  }

  const renderGroup = (titleKey: string, group: typeof items) => (
    <section className="mt-8">
      <h2 className="border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        <T k={titleKey} />
      </h2>
      <ul className="mt-4 space-y-2">
        {group.map((it) => (
          <li
            key={it.id}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-3 transition-colors hover:border-red-800"
          >
            <Link href={it.url} className="min-w-0 flex-1">
              <span className="text-xs text-zinc-500">{it.date}</span>
              <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{it.title}</span>
            </Link>
            <button
              type="button"
              onClick={() => remove(it.id)}
              aria-label={`${t("saved.remove")}: ${it.title}`}
              title={t("saved.remove")}
              className="inline-flex shrink-0 items-center justify-center rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-zinc-500">
          <T k="saved.count" values={{ n: items.length }} />
        </p>
        <button
          type="button"
          onClick={clear}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> <T k="saved.clearAll" />
        </button>
      </div>
      {articles.length > 0 && renderGroup("saved.articles", articles)}
      {recordings.length > 0 && renderGroup("saved.recordings", recordings)}
    </div>
  );
}

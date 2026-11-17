// Global search: one box across news, recordings, publications, schedule
// programmes and directory sites, with working filters and sorting.
"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SearchKind, SearchResultItem } from "@/app/api/search/route";
import { useLanguage } from "@/i18n/LanguageContext";
import { T } from "@/i18n/T";

interface SearchResponse {
  query: string;
  counts: Record<SearchKind, number>;
  total: number;
  facets: { categories: string[]; channels: string[]; sources: string[] };
  results: Record<SearchKind, SearchResultItem[]>;
}

const TYPE_TABS: { id: SearchKind | "all"; key: string }[] = [
  { id: "all", key: "search.all" },
  { id: "news", key: "search.news" },
  { id: "recording", key: "search.recordings" },
  { id: "publication", key: "search.publications" },
  { id: "schedule", key: "search.schedule" },
  { id: "directory", key: "search.directory" },
];

const GROUP_KEY: Record<SearchKind, string> = {
  news: "search.news",
  recording: "search.recordings",
  publication: "search.publications",
  schedule: "search.programmeGuide",
  directory: "search.directory",
};

const CHANNEL_LABEL: Record<string, string> = {
  kctv: "KCTV",
  sports: "Athletic TV",
  ryongnamsan: "Ryongnamsan TV",
};

function ResultCard({ item }: { item: SearchResultItem }) {
  return (
    <li className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 transition-colors hover:border-red-800 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60">
      <Link href={item.href} className="block p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {item.channel && (
            <span className="rounded bg-red-100 dark:bg-red-900/70 px-2 py-0.5 font-semibold text-red-800 dark:text-red-200">
              {CHANNEL_LABEL[item.channel] ?? item.channel}
            </span>
          )}
          {item.category && (
            <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-300">{item.category}</span>
          )}
          {item.source && (
            <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-300">{item.source}</span>
          )}
          {item.date && <span className="text-zinc-500">{item.date}</span>}
        </div>
        <h3 className="mt-1.5 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{item.title}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">{item.subtitle}</p>
      </Link>
    </li>
  );
}

export default function GlobalSearch() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const q = sp.get("q") || "";
  const type = (sp.get("type") || "all") as SearchKind | "all";
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";
  const channel = sp.get("channel") || "all";
  const category = sp.get("category") || "all";
  const source = sp.get("source") || "all";
  // NOTE: this `lang` is the search filter (content language en/ko), not
  // the UI language — the UI language comes from useLanguage() above.
  const lang = sp.get("lang") || "all";
  const sort = sp.get("sort") || "relevance";

  const [input, setInput] = useState(q);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const firstLoad = useRef(true);

  useEffect(() => setInput(q), [q]);

  const setParam = useCallback(
    (patch: Record<string, string>, resetType = false) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (!v || v === "all") next.delete(k);
        else next.set(k, v);
      }
      if (resetType) next.delete("type");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, sp]
  );

  useEffect(() => {
    const params = new URLSearchParams(sp.toString());
    const qs = params.toString();
    setLoading(true);
    setError(false);
    let cancelled = false;
    fetch(`/api/search?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("search failed"))))
      .then((json: SearchResponse) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          firstLoad.current = false;
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setParam({ q: input.trim() });
  };

  const visibleGroups = useMemo(
    () => (TYPE_TABS.filter((t) => t.id !== "all") as { id: SearchKind }[]).filter((t) => type === "all" || type === t.id),
    [type]
  );

  const hasActiveFilters =
    from || to || channel !== "all" || category !== "all" || source !== "all" || lang !== "all";

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("search.placeholder")} aria-label={t("search.searchAria")}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
          autoFocus
        />
        <button
          type="submit"
          className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
        >
          <T k="search.searchButton" />
        </button>
      </form>

      {/* Type tabs with counts */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("search.resultTypesAria")}>
        {TYPE_TABS.map((t) => {
          const count = t.id === "all" ? (data?.total ?? 0) : (data?.counts[t.id] ?? 0);
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={type === t.id}
              onClick={() => setParam({ type: t.id === "all" ? "" : t.id })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                type === t.id ? "bg-red-700 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              <T k={t.key} />
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            <T k="search.from" />
            <input
              type="date"
              value={from}
              onChange={(e) => setParam({ from: e.target.value })}
              className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            <T k="search.to" />
            <input
              type="date"
              value={to}
              onChange={(e) => setParam({ to: e.target.value })}
              className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            <T k="search.channel" />
            <select
              value={channel}
              onChange={(e) => setParam({ channel: e.target.value })}
              className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
            >
              <option value="all">
                <T k="search.allChannels" />
              </option>
              <option value="kctv">KCTV</option>
              <option value="sports">Athletic TV</option>
              <option value="ryongnamsan">Ryongnamsan TV</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            <T k="search.category" />
            <select
              value={category}
              onChange={(e) => setParam({ category: e.target.value })}
              className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
            >
              <option value="all">
                <T k="search.allCategories" />
              </option>
              {(data?.facets.categories ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            <T k="search.source" />
            <select
              value={source}
              onChange={(e) => setParam({ source: e.target.value })}
              className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
            >
              <option value="all">
                <T k="search.allSources" />
              </option>
              {(data?.facets.sources ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            <T k="search.language" />
            <select
              value={lang}
              onChange={(e) => setParam({ lang: e.target.value })}
              className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
            >
              <option value="all">
                <T k="search.allLanguages" />
              </option>
              <option value="en">
                <T k="search.english" />
              </option>
              <option value="ko">
                <T k="search.korean" />
              </option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            <T k="search.sort" />
            <select
              value={sort}
              onChange={(e) => setParam({ sort: e.target.value })}
              className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
            >
              <option value="relevance">
                <T k="search.relevance" />
              </option>
              <option value="newest">
                <T k="search.newestFirst" />
              </option>
              <option value="oldest">
                <T k="search.oldestFirst" />
              </option>
            </select>
          </label>
          {hasActiveFilters && (
            <button
              onClick={() => router.replace(`${pathname}${q ? `?q=${encodeURIComponent(q)}` : ""}`, { scroll: false })}
              className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <T k="search.clearFilters" />
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          <T k="search.explainer" />
        </p>
      </div>

      {/* Results */}
      {loading && firstLoad.current && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <T k="search.searching" />
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-sm text-zinc-600 dark:text-zinc-400">
          <T k="search.unavailable" />
        </p>
      )}
      {data && !error && (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {loading && (
              <>
                <T k="search.updating" />{" "}
              </>
            )}
            {data.total === 1 ? (
              <T k="search.resultOne" />
            ) : (
              <T k="search.resultOther" values={{ n: data.total }} />
            )}
            {q ? (
              <>
                {" "}
                <T k="search.for" />{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">&ldquo;{data.query}&rdquo;</span>
              </>
            ) : (
              <>
                {" "}
                <T k="search.showingEverything" />
              </>
            )}
          </p>
          {data.total === 0 && (
            <p className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
              <T k="search.nothingMatches" />
            </p>
          )}
          {visibleGroups.map((g) => {
            const items = data.results[g.id];
            if (!items || items.length === 0) return null;
            const count = data.counts[g.id];
            return (
              <section key={g.id}>
                <h2 className="mb-2 flex items-baseline gap-2 text-base font-bold text-zinc-900 dark:text-white">
                  <span className="inline-block h-4 w-1 rounded bg-red-600" />
                  <T k={GROUP_KEY[g.id]} />
                  <span className="text-sm font-normal text-zinc-500">
                    {count === 1 ? (
                      <T k="search.resultOne" />
                    ) : (
                      <T k="search.resultOther" values={{ n: count }} />
                    )}
                  </span>
                </h2>
                <ul className="grid gap-3 md:grid-cols-2">
                  {items.map((it, i) => (
                    <ResultCard key={`${it.kind}-${it.href}-${i}`} item={it} />
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

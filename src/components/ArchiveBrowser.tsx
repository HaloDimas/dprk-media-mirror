"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { KCNW_SOURCE_GROUPS } from "@/lib/kcnw-sources";
import type { KcnwArticle } from "@/lib/types";

type SearchState = {
  status: "idle" | "loading" | "done" | "unavailable" | "not-configured" | "error";
  count: number;
  articles: KcnwArticle[];
  hasMore: boolean;
};

function ArticleCard({ a }: { a: KcnwArticle }) {
  return (
    <li className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 transition-colors hover:border-red-800">
      <Link href={`/news/${a.id}`} className="flex gap-4 p-4 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
        {a.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.image} alt="" className="hidden h-20 w-28 shrink-0 rounded-md object-cover sm:block" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-300">KCNA Watch</span>
            <span className="text-zinc-500">{a.date}</span>
          </div>
          <h3 className="mt-1 font-medium leading-snug text-zinc-900 dark:text-zinc-100">{a.title}</h3>
          {a.excerpt && <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{a.excerpt}</p>}
        </div>
      </Link>
    </li>
  );
}

export default function ArchiveBrowser() {
  // --- Search (authenticated, full 1.37M archive) ---
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState("");
  const [search, setSearch] = useState<SearchState>({
    status: "idle",
    count: 0,
    articles: [],
    hasMore: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const searchParams = useRef({ q: "", source: "", sort: "" });

  const runSearch = useCallback(async (from: number, append: boolean) => {
    const { q: qq, source: ss, sort: srt } = searchParams.current;
    if (!qq.trim()) return;
    if (append) setLoadingMore(true);
    else setSearch({ status: "loading", count: 0, articles: [], hasMore: false });
    try {
      const params = new URLSearchParams({ q: qq.trim(), from: String(from), sort: srt });
      if (ss) params.set("source", ss);
      const res = await fetch(`/api/kcnw-search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "kcnw_not_configured")
          setSearch({ status: "not-configured", count: 0, articles: [], hasMore: false });
        else setSearch({ status: "unavailable", count: 0, articles: [], hasMore: false });
        return;
      }
      setSearch((prev) => ({
        status: "done",
        count: data.count ?? 0,
        articles: append ? [...prev.articles, ...(data.articles ?? [])] : (data.articles ?? []),
        hasMore: !!data.hasMore,
      }));
    } catch {
      setSearch({ status: "error", count: 0, articles: [], hasMore: false });
    } finally {
      setLoadingMore(false);
    }
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchParams.current = { q, source, sort };
    runSearch(0, false);
  };

  // --- Browse the archive (anonymous, latest first, walking back in time) ---
  const [browse, setBrowse] = useState<KcnwArticle[]>([]);
  const [browseFrom, setBrowseFrom] = useState(0);
  const [browseHasMore, setBrowseHasMore] = useState(true);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState(false);

  const loadBrowse = useCallback(async (from: number, append: boolean) => {
    setBrowseLoading(true);
    setBrowseError(false);
    try {
      const res = await fetch(`/api/kcnw-latest?from=${from}&sort=&lang=`);
      const data = await res.json();
      if (!res.ok) throw new Error("browse failed");
      setBrowse((prev) => (append ? [...prev, ...(data.articles ?? [])] : (data.articles ?? [])));
      setBrowseFrom(from + (data.articles?.length ?? 0));
      setBrowseHasMore(!!data.hasMore);
    } catch {
      setBrowseError(true);
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrowse(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectCls = "min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-2 text-sm text-zinc-900 dark:text-zinc-100";

  return (
    <div className="space-y-10">
      {/* Search the full archive */}
      <section>
        <h2 className="border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Search the full archive — 1.37M articles
        </h2>
        <p className="mt-1 pl-3 text-sm text-zinc-600 dark:text-zinc-400">
          Search every KCNA Watch article back to 2016. Results are paginated, 20 per page. There is
          no date filter — the archive&apos;s date parameters do not work.
        </p>
        <form onSubmit={onSearch} className="mt-4 flex flex-wrap items-end gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the archive… e.g. Kim Jong Un" aria-label="Search the archive"
            className="min-w-56 flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
          />
          <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            Source
            <select value={source} onChange={(e) => setSource(e.target.value)} className={selectCls}>
              <option value="">All sources</option>
              {KCNW_SOURCE_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
              <option value="">Latest first</option>
              <option value="pop">Most popular</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Search
          </button>
        </form>

        {search.status === "loading" && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Searching the archive…</p>
        )}
        {search.status === "unavailable" && (
          <p className="mt-4 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-100 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Archive search is unavailable — the mirror&apos;s KCNA Watch session has expired. The
            browse section below still works (it needs no login).
          </p>
        )}
        {search.status === "not-configured" && (
          <p className="mt-4 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-100 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Archive search is not configured yet. The browse section below still works (it needs no
            login).
          </p>
        )}
        {search.status === "error" && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">The search failed. Please try again.</p>
        )}
        {search.status === "done" && (
          <>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              {search.count.toLocaleString()} results
              {search.articles.length > 0 && ` — showing ${search.articles.length}`}
            </p>
            <ul className="mt-3 space-y-3">
              {search.articles.map((a) => (
                <ArticleCard key={a.id} a={a} />
              ))}
            </ul>
            {search.articles.length === 0 && (
              <p className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                No articles match your search.
              </p>
            )}
            {search.hasMore && (
              <button
                onClick={() => runSearch(search.articles.length, true)}
                disabled={loadingMore}
                className="mt-4 rounded-md bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more (next 20)"}
              </button>
            )}
          </>
        )}
      </section>

      {/* Browse the archive */}
      <section>
        <h2 className="border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Browse the archive — latest first, back to ~2015
        </h2>
        <p className="mt-1 pl-3 text-sm text-zinc-600 dark:text-zinc-400">
          Walk back through ~430,000 articles, 10 at a time. No login needed. Note: at very deep
          offsets the ordering can repeat or skip articles.
        </p>
        <ul className="mt-4 space-y-3">
          {browse.map((a) => (
            <ArticleCard key={a.id} a={a} />
          ))}
        </ul>
        {browseError && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Could not load more articles. Please try again.</p>
        )}
        {browseHasMore && (
          <button
            onClick={() => loadBrowse(browseFrom, true)}
            disabled={browseLoading}
            className="mt-4 rounded-md bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            {browseLoading ? "Loading…" : "Load more (next 10)"}
          </button>
        )}
        {!browseHasMore && browse.length > 0 && (
          <p className="mt-4 text-sm text-zinc-500">End of the browsable archive.</p>
        )}
      </section>
    </div>
  );
}

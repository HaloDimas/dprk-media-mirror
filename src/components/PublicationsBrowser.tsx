"use client";

import { useMemo, useState } from "react";
import type { PeriodicalItem, PublicationItem, StampIssue } from "@/lib/types";

function formatSize(bytes: number): string {
  if (!bytes) return "";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type Sort = "newest" | "oldest" | "title";

export default function PublicationsBrowser({
  publications,
  periodicals,
  stamps,
}: {
  publications: PublicationItem[];
  periodicals: PeriodicalItem[];
  stamps: StampIssue[];
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "newspaper" | "magazine" | "book" | "periodical">("all");
  const [pub, setPub] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [viewing, setViewing] = useState<{ title: string; url: string } | null>(null);

  const pubNames = useMemo(() => {
    const set = new Set<string>();
    for (const p of publications) set.add(p.title);
    for (const p of periodicals) set.add(p.publication);
    return [...set].sort();
  }, [publications, periodicals]);

  const years = useMemo(() => {
    const set = new Set<string>();
    for (const p of publications) {
      const y = p.publishedYear.slice(0, 4);
      if (/^\d{4}$/.test(y)) set.add(y);
    }
    for (const p of periodicals) {
      const y = p.issueDate.slice(0, 4);
      if (/^\d{4}$/.test(y)) set.add(y);
    }
    return [...set].sort().reverse();
  }, [publications, periodicals]);

  const sortList = <T extends { publishedYear?: string; issueDate?: string; title?: string; publication?: string }>(
    list: T[],
    dateOf: (x: T) => string,
    nameOf: (x: T) => string
  ): T[] => {
    const copy = [...list];
    if (sort === "title") copy.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    else if (sort === "oldest") copy.sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
    else copy.sort((a, b) => dateOf(b).localeCompare(dateOf(a)));
    return copy;
  };

  const pubs = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = publications.filter((p) => {
      if (type !== "all" && type !== "periodical" && p.category !== type) return false;
      if (type === "periodical") return false;
      if (pub !== "all" && p.title !== pub) return false;
      if (year !== "all" && !p.publishedYear.startsWith(year)) return false;
      if (
        needle &&
        !p.title.toLowerCase().includes(needle) &&
        !p.publishedYear.includes(needle) &&
        !(p.description ?? "").toLowerCase().includes(needle)
      )
        return false;
      return true;
    });
    return sortList(list, (p) => p.publishedYear, (p) => p.title);
  }, [publications, q, type, pub, year, sort]);

  const pers = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = periodicals.filter((p) => {
      if (type !== "all" && type !== "periodical") return false;
      if (pub !== "all" && p.publication !== pub) return false;
      if (year !== "all" && !p.issueDate.startsWith(year)) return false;
      if (needle && !p.publication.toLowerCase().includes(needle) && !p.issueDate.includes(needle))
        return false;
      return true;
    });
    return sortList(list, (p) => p.issueDate, (p) => p.publication);
  }, [periodicals, q, type, pub, year, sort]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { newspaper: 0, magazine: 0, book: 0 };
    for (const p of publications) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [publications]);

  const selectCls =
    "min-w-0 max-w-full truncate rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100";

  return (
    <div>
      {viewing && (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-2 flex items-start justify-between gap-4">
            <h2 className="font-semibold text-zinc-100">{viewing.title}</h2>
            <button
              onClick={() => setViewing(null)}
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Close viewer
            </button>
          </div>
          <iframe
            src={viewing.url}
            title={viewing.title}
            className="h-[70vh] w-full rounded-lg bg-white"
          />
          <p className="mt-2 text-xs text-zinc-500">
            The PDF is displayed in this site&apos;s own viewer, served through this site&apos;s file proxy.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search titles…" aria-label="Search titles"
          className="min-w-56 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
        />
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
          Type
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={selectCls}>
            <option value="all">All ({publications.length + periodicals.length})</option>
            <option value="newspaper">Newspaper ({typeCounts.newspaper ?? 0})</option>
            <option value="magazine">Magazine ({typeCounts.magazine ?? 0})</option>
            <option value="book">Book ({typeCounts.book ?? 0})</option>
            <option value="periodical">Periodical ({periodicals.length})</option>
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
          Publication
          <select value={pub} onChange={(e) => setPub(e.target.value)} className={`${selectCls} w-44 sm:w-56`}>
            <option value="all">All publications</option>
            {pubNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
          Year
          <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
            <option value="all">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="ml-auto flex min-w-0 items-center gap-2 text-xs text-zinc-400">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={selectCls}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        {pubs.length + pers.length} of {publications.length + periodicals.length} items.
      </p>

      {stamps.length > 0 && (
        <>
          <h2 className="mt-8 border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-100">
            New stamp issues — Korean Stamp ({stamps.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {stamps.map((s) => (
              <li
                key={s.stockNo}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3"
              >
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                  Stock No. {s.stockNo}
                </span>
                <span className="text-sm font-medium text-zinc-100">{s.title}</span>
                <span className="text-xs text-zinc-500">{s.date}</span>
                {s.pdf && (
                  <a
                    href={s.pdf}
                    className="ml-auto rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                  >
                    Download PDF
                  </a>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-8 border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-100">
        Newspapers, magazines &amp; books ({pubs.length})
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pubs.map((p) => (
          <li
            key={p.id}
            className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 transition-colors hover:border-red-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.cover} alt={p.title} className="aspect-[3/4] w-full object-cover object-top" loading="lazy" />
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-zinc-800 px-2 py-0.5 capitalize text-zinc-300">{p.category}</span>
              </div>
              <h3 className="mt-1 text-sm font-medium text-zinc-100">{p.title}</h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                {p.publishedYear} · {formatSize(p.fileSize)}
              </p>
              {p.description && <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{p.description}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setViewing({ title: `${p.title} — ${p.publishedYear}`, url: p.view })}
                  className="flex-1 rounded-md bg-red-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                >
                  Read here
                </button>
                <a
                  href={p.download}
                  className="flex-1 rounded-md bg-zinc-800 px-2 py-1.5 text-center text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                >
                  Download
                </a>
              </div>
            </div>
          </li>
        ))}
        {pubs.length === 0 && (
          <li className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400 sm:col-span-2 lg:col-span-4">
            No publications match your filters.
          </li>
        )}
      </ul>

      <h2 className="mt-10 border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-100">
        Periodicals — Kumsugangsan ({pers.length})
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pers.map((p) => (
          <li
            key={p.id}
            className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 transition-colors hover:border-red-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt={p.publication} className="aspect-[3/4] w-full object-cover object-top" loading="lazy" />
            <div className="p-3">
              <h3 className="text-sm font-medium text-zinc-100">{p.publication}</h3>
              <p className="mt-0.5 text-xs text-zinc-500">{p.issueDate}</p>
              <button
                onClick={() => setViewing({ title: `${p.publication} — ${p.issueDate}`, url: p.view })}
                className="mt-3 w-full rounded-md bg-red-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-600"
              >
                Read here
              </button>
            </div>
          </li>
        ))}
        {pers.length === 0 && (
          <li className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400 sm:col-span-2 lg:col-span-4">
            No periodicals match your filters.
          </li>
        )}
      </ul>
    </div>
  );
}

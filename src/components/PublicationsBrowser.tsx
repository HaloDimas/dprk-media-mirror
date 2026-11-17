"use client";

import { useMemo, useState } from "react";
import type { PeriodicalItem, PublicationItem, StampIssue } from "@/lib/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { T } from "@/i18n/T";

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
  const { t } = useLanguage();
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
    "min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-2 text-sm text-zinc-900 dark:text-zinc-100";

  return (
    <div>
      {viewing && (
        <div className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 p-4">
          <div className="mb-2 flex items-start justify-between gap-4">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{viewing.title}</h2>
            <button
              onClick={() => setViewing(null)}
              className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <T k="publications.closeViewer" />
            </button>
          </div>
          <iframe
            src={viewing.url}
            title={viewing.title}
            className="h-[70vh] w-full rounded-lg bg-white"
          />
          <p className="mt-2 text-xs text-zinc-500">
            <T k="publications.viewerNote" />
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("publications.searchPlaceholder")} aria-label={t("publications.searchAria")}
          className="min-w-56 flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
        />
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <T k="publications.type" />
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={selectCls}>
            <option value="all">
              <T k="publications.all" values={{ n: publications.length + periodicals.length }} />
            </option>
            <option value="newspaper">
              <T k="publications.newspaper" values={{ n: typeCounts.newspaper ?? 0 }} />
            </option>
            <option value="magazine">
              <T k="publications.magazine" values={{ n: typeCounts.magazine ?? 0 }} />
            </option>
            <option value="book">
              <T k="publications.book" values={{ n: typeCounts.book ?? 0 }} />
            </option>
            <option value="periodical">
              <T k="publications.periodical" values={{ n: periodicals.length }} />
            </option>
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <T k="publications.publication" />
          <select value={pub} onChange={(e) => setPub(e.target.value)} className={`${selectCls} w-44 sm:w-56`}>
            <option value="all">
              <T k="publications.allPublications" />
            </option>
            {pubNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <T k="publications.year" />
          <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
            <option value="all">
              <T k="publications.allYears" />
            </option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="ml-auto flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <T k="publications.sort" />
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={selectCls}>
            <option value="newest">
              <T k="publications.newestFirst" />
            </option>
            <option value="oldest">
              <T k="publications.oldestFirst" />
            </option>
            <option value="title">
              <T k="publications.titleAZ" />
            </option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        <T k="publications.countOf" values={{ shown: pubs.length + pers.length, total: publications.length + periodicals.length }} />
      </p>

      {stamps.length > 0 && (
        <>
          <h2 className="mt-8 border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <T k="publications.stampHeading" values={{ n: stamps.length }} />
          </h2>
          <ul className="mt-3 space-y-2">
            {stamps.map((s) => (
              <li
                key={s.stockNo}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 px-4 py-3"
              >
                <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                  <T k="publications.stockNo" values={{ n: s.stockNo }} />
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.title}</span>
                <span className="text-xs text-zinc-500">{s.date}</span>
                {s.pdf && (
                  <a
                    href={s.pdf}
                    className="ml-auto rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <T k="publications.downloadPdf" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-8 border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        <T k="publications.papersHeading" values={{ n: pubs.length }} />
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pubs.map((p) => (
          <li
            key={p.id}
            className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 transition-colors hover:border-red-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.cover} alt={p.title} className="aspect-[3/4] w-full object-cover object-top" loading="lazy" />
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 capitalize text-zinc-700 dark:text-zinc-300">{p.category}</span>
              </div>
              <h3 className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.title}</h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                {p.publishedYear} · {formatSize(p.fileSize)}
              </p>
              {p.description && <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">{p.description}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setViewing({ title: `${p.title} — ${p.publishedYear}`, url: p.view })}
                  className="flex-1 rounded-md bg-red-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                >
                  <T k="publications.readHere" />
                </button>
                <a
                  href={p.download}
                  className="flex-1 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-1.5 text-center text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  <T k="publications.download" />
                </a>
              </div>
            </div>
          </li>
        ))}
        {pubs.length === 0 && (
          <li className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400 sm:col-span-2 lg:col-span-4">
            <T k="publications.noPublications" />
          </li>
        )}
      </ul>

      <h2 className="mt-10 border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        <T k="publications.periodicalsHeading" values={{ n: pers.length }} />
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pers.map((p) => (
          <li
            key={p.id}
            className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 transition-colors hover:border-red-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt={p.publication} className="aspect-[3/4] w-full object-cover object-top" loading="lazy" />
            <div className="p-3">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.publication}</h3>
              <p className="mt-0.5 text-xs text-zinc-500">{p.issueDate}</p>
              <button
                onClick={() => setViewing({ title: `${p.publication} — ${p.issueDate}`, url: p.view })}
                className="mt-3 w-full rounded-md bg-red-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-600"
              >
                <T k="publications.readHere" />
              </button>
            </div>
          </li>
        ))}
        {pers.length === 0 && (
          <li className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400 sm:col-span-2 lg:col-span-4">
            <T k="publications.noPeriodicals" />
          </li>
        )}
      </ul>
    </div>
  );
}

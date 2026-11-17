"use client";

import { useMemo, useState } from "react";
import { Mail, X } from "lucide-react";
import type { DirectoryCategory, DirectoryStatus } from "@/data/directory";
import { useLanguage } from "@/i18n/LanguageContext";
import { T } from "@/i18n/T";

/** Category titles/blurbs are UI chrome and live in the dictionaries —
 *  only the entry names/descriptions (verified data records) stay in
 *  data/directory.ts untranslated. */
const CAT_KEY: Record<string, { title: string; blurb: string }> = {
  "news-media": { title: "directory.catNewsMedia", blurb: "directory.catNewsMediaBlurb" },
  government: { title: "directory.catGovernment", blurb: "directory.catGovernmentBlurb" },
  "education-research": { title: "directory.catEducation", blurb: "directory.catEducationBlurb" },
  culture: { title: "directory.catCulture", blurb: "directory.catCultureBlurb" },
  tourism: { title: "directory.catTourism", blurb: "directory.catTourismBlurb" },
  business: { title: "directory.catBusiness", blurb: "directory.catBusinessBlurb" },
  older: { title: "directory.catOlder", blurb: "directory.catOlderBlurb" },
};

const STATUS_BADGE_KEY: Record<DirectoryStatus, string> = {
  live: "directory.liveVerified",
  active: "directory.activeJuly",
  flaky: "directory.flakyLabel",
  dead: "directory.deadLabel",
  "not-a-website": "directory.notWebsiteLabel",
  "mail-only": "directory.mailOnlyLabel",
};

const STATUS_LABEL_KEY: Record<DirectoryStatus, string> = {
  live: "directory.statusLive",
  active: "directory.statusActive",
  flaky: "directory.statusFlaky",
  dead: "directory.statusDead",
  "not-a-website": "directory.statusNotWebsite",
  "mail-only": "directory.statusMailOnly",
};

export function StatusBadge({ status }: { status: DirectoryStatus }) {
  const { t } = useLanguage();
  if (status === "live")
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-emerald-100 dark:bg-emerald-900/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-300" aria-hidden="true" />
        {t(STATUS_BADGE_KEY.live)}
      </span>
    );
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-emerald-100 dark:bg-emerald-900/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-300" aria-hidden="true" />
        {t(STATUS_BADGE_KEY.active)}
      </span>
    );
  if (status === "flaky")
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-amber-100 dark:bg-amber-900/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
        <span
          className="h-1.5 w-1.5 rounded-full border border-amber-200"
          style={{ background: "linear-gradient(90deg, #fcd34d 50%, transparent 50%)" }}
          aria-hidden="true"
        />
        {t(STATUS_BADGE_KEY.flaky)}
      </span>
    );
  if (status === "dead")
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-red-100 dark:bg-red-900/70 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:text-red-200">
        <X className="h-3 w-3" aria-hidden="true" />
        {t(STATUS_BADGE_KEY.dead)}
      </span>
    );
  if (status === "not-a-website")
    return (
      <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
        {t(STATUS_BADGE_KEY["not-a-website"])}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
      <Mail className="h-3 w-3" aria-hidden="true" />
      {t(STATUS_BADGE_KEY["mail-only"])}
    </span>
  );
}

export default function DirectoryBrowser({
  categories,
  total,
}: {
  categories: DirectoryCategory[];
  total: number;
}) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const statusCounts = useMemo(() => {
    const map = new Map<DirectoryStatus, number>();
    for (const c of categories)
      for (const e of c.entries) map.set(e.status, (map.get(e.status) ?? 0) + 1);
    return map;
  }, [categories]);

  const catCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categories) map.set(c.id, c.entries.length);
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return categories
      .filter((c) => cat === "all" || c.id === cat)
      .map((c) => ({
        ...c,
        entries: c.entries.filter((e) => {
          if (status !== "all" && e.status !== status) return false;
          if (
            needle &&
            !e.name.toLowerCase().includes(needle) &&
            !(e.description ?? "").toLowerCase().includes(needle) &&
            !(e.url ?? "").toLowerCase().includes(needle)
          )
            return false;
          return true;
        }),
      }))
      .filter((c) => c.entries.length > 0);
  }, [categories, q, cat, status]);

  const shown = filtered.reduce((n, c) => n + c.entries.length, 0);
  const selectCls = "min-w-0 max-w-full truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-2 text-sm text-zinc-900 dark:text-zinc-100";

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("directory.searchPlaceholder")} aria-label={t("directory.searchAria")}
          className="min-w-56 flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
        />
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <T k="directory.category" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={selectCls}>
            <option value="all">
              <T k="directory.allCategories" values={{ n: total }} />
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {t(CAT_KEY[c.id]?.title ?? "") || c.title} ({catCounts.get(c.id) ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <T k="directory.status" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
            <option value="all">
              <T k="directory.allStatuses" />
            </option>
            {(Object.keys(STATUS_LABEL_KEY) as DirectoryStatus[]).map((s) => (
              <option key={s} value={s}>
                <T k={STATUS_LABEL_KEY[s]} /> ({statusCounts.get(s) ?? 0})
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        <T k="directory.ofSites" values={{ shown, total }} />
        {status !== "all" && (
          <>
            {" "}
            <T
              k="directory.statusTotal"
              values={{ label: t(STATUS_LABEL_KEY[status as DirectoryStatus]), n: statusCounts.get(status as DirectoryStatus) ?? 0 }}
            />
          </>
        )}
      </p>

      <div className="mt-5 space-y-8">
        {filtered.map((c) => (
          <section key={c.id}>
            <h2 className="border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <T k={CAT_KEY[c.id]?.title ?? ""} /> ({c.entries.length})
            </h2>
            <p className="mt-0.5 pl-3 text-sm text-zinc-500">
              <T k={CAT_KEY[c.id]?.blurb ?? ""} />
            </p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {c.entries.map((entry) => (
                <li
                  key={entry.name}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4 transition-colors hover:border-red-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{entry.name}</h3>
                    <StatusBadge status={entry.status} />
                  </div>
                  {entry.description && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{entry.description}</p>}
                  <p className="mt-2 font-mono text-xs text-zinc-500">
                    {entry.url ? entry.url : <T k="directory.urlPending" />}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                    <T k={CAT_KEY[c.id]?.title ?? ""} />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            <T k="directory.noMatch" />
          </p>
        )}
      </div>
    </div>
  );
}

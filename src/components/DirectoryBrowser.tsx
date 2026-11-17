"use client";

import { useMemo, useState } from "react";
import { Mail, X } from "lucide-react";
import type { DirectoryCategory, DirectoryStatus } from "@/data/directory";

export function StatusBadge({ status }: { status: DirectoryStatus }) {
  if (status === "live")
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-emerald-900/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
        Live (verified 15 Nov 2026)
      </span>
    );
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-emerald-900/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
        Active (July 2026 list)
      </span>
    );
  if (status === "flaky")
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-amber-900/70 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
        <span
          className="h-1.5 w-1.5 rounded-full border border-amber-200"
          style={{ background: "linear-gradient(90deg, #fcd34d 50%, transparent 50%)" }}
          aria-hidden="true"
        />
        Active domain, unreachable here
      </span>
    );
  if (status === "dead")
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-red-900/70 px-2 py-0.5 text-[11px] font-semibold text-red-200">
        <X className="h-3 w-3" aria-hidden="true" />
        Dead
      </span>
    );
  if (status === "not-a-website")
    return (
      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
        — Not a website
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
      <Mail className="h-3 w-3" aria-hidden="true" />
      Mail server only
    </span>
  );
}

const STATUS_LABELS: Record<DirectoryStatus, string> = {
  live: "Live",
  active: "Active domain",
  flaky: "Active domain, unreachable here",
  dead: "Dead",
  "not-a-website": "Not a website",
  "mail-only": "Mail server only",
};

export default function DirectoryBrowser({
  categories,
  total,
}: {
  categories: DirectoryCategory[];
  total: number;
}) {
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
  const selectCls = "min-w-0 max-w-full truncate rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100";

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, description or URL…" aria-label="Search the directory"
          className="min-w-56 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
        />
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
          Category
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={selectCls}>
            <option value="all">All categories ({total})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({catCounts.get(c.id) ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_LABELS) as DirectoryStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]} ({statusCounts.get(s) ?? 0})
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        {shown} of {total} sites.
        {status !== "all" && ` ${STATUS_LABELS[status as DirectoryStatus]}: ${statusCounts.get(status as DirectoryStatus) ?? 0} total.`}
      </p>

      <div className="mt-5 space-y-8">
        {filtered.map((c) => (
          <section key={c.id}>
            <h2 className="border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-100">
              {c.title} ({c.entries.length})
            </h2>
            <p className="mt-0.5 pl-3 text-sm text-zinc-500">{c.blurb}</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {c.entries.map((entry) => (
                <li
                  key={entry.name}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-red-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-100">{entry.name}</h3>
                    <StatusBadge status={entry.status} />
                  </div>
                  {entry.description && <p className="mt-1 text-sm text-zinc-400">{entry.description}</p>}
                  <p className="mt-2 font-mono text-xs text-zinc-500">
                    {entry.url ? entry.url : "URL pending verification"}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-600">{c.title}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400">
            No sites match your filters.
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { PeriodicalItem, PublicationItem } from "@/lib/types";

function formatSize(bytes: number): string {
  if (!bytes) return "";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function PublicationsBrowser({
  publications,
  periodicals,
}: {
  publications: PublicationItem[];
  periodicals: PeriodicalItem[];
}) {
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<{ title: string; url: string } | null>(null);

  const pubs = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return publications.filter(
      (p) =>
        !needle ||
        p.title.toLowerCase().includes(needle) ||
        p.publishedYear.includes(needle) ||
        (p.description ?? "").toLowerCase().includes(needle)
    );
  }, [publications, q]);

  const pers = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return periodicals.filter(
      (p) => !needle || p.publication.toLowerCase().includes(needle) || p.issueDate.includes(needle)
    );
  }, [periodicals, q]);

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

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search newspapers and magazines…"
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
      />

      <h2 className="mt-8 text-lg font-semibold text-zinc-100">
        Newspapers — The Pyongyang Times &amp; DPR Korea ({pubs.length})
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pubs.map((p) => (
          <li key={p.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.cover} alt={p.title} className="aspect-[3/4] w-full object-cover object-top" loading="lazy" />
            <div className="p-3">
              <h3 className="text-sm font-medium text-zinc-100">{p.title}</h3>
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
            No newspapers match your search.
          </li>
        )}
      </ul>

      <h2 className="mt-10 text-lg font-semibold text-zinc-100">
        Periodicals — Kumsugangsan ({pers.length})
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pers.map((p) => (
          <li key={p.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
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
            No periodicals match your search.
          </li>
        )}
      </ul>
    </div>
  );
}

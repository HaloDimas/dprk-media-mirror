/** Shared loading UI: shown instantly on navigation while a route loads,
    so users never stare at a frozen-looking page. */

"use client";

import { useLanguage } from "@/i18n/LanguageContext";

/** labelKey: a dictionary key (e.g. "loading.page") translated live;
 *  label: a fixed string (English fallback). Defaults to "loading.default". */
export function Spinner({ label, labelKey }: { label?: string; labelKey?: string }) {
  const { t } = useLanguage();
  const text = labelKey ? t(labelKey) : label ?? t("loading.default");
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 dark:border-zinc-800 border-t-red-500"
        role="status"
        aria-label={text}
      />
      <div>
        <p className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
          DPRK <span className="text-red-500">Media Mirror</span>
        </p>
        <p className="mt-1 animate-pulse text-sm text-zinc-600 dark:text-zinc-400">{text}</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4">
      <div className="h-40 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="mt-3 h-4 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="mt-2 h-4 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="mt-3 h-3 w-1/4 rounded bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex animate-pulse gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4">
      <div className="h-16 w-24 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="flex-1">
        <div className="h-4 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="mt-3 h-3 w-1/4 rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

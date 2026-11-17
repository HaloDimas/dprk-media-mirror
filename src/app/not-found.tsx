import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/i18n/T";

export const metadata: Metadata = {
  title: "Page not found — DPRK Media Mirror",
  description: "The page you are looking for does not exist on DPRK Media Mirror.",
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <p className="text-6xl font-bold text-red-600 dark:text-red-500" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">
        <T k="notFound.title" />
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <T k="notFound.body" />
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
        >
          <T k="notFound.goHome" />
        </Link>
        <Link
          href="/news"
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <T k="notFound.browseNews" />
        </Link>
        <Link
          href="/live"
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <T k="notFound.watchLive" />
        </Link>
      </div>
    </div>
  );
}

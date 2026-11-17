"use client";

import { useEffect } from "react";
import Link from "next/link";
import { T } from "@/i18n/T";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Log the error for the server logs; the message shown to the visitor
    // stays generic so no upstream detail leaks to the client.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
        <T k="error.title" />
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <T k="error.body" />
      </p>
      {error?.digest && (
        <p className="mt-3 text-xs text-zinc-500">
          <T k="error.ref" values={{ digest: error.digest }} />
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
        >
          <T k="error.tryAgain" />
        </button>
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <T k="error.goHome" />
        </Link>
      </div>
    </div>
  );
}

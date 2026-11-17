import type { Metadata } from "next";
import SavedList from "@/components/SavedList";
import { T } from "@/i18n/T";

export const metadata: Metadata = {
  title: "Saved — DPRK Media Mirror",
  description: "Articles and recordings you bookmarked on this mirror.",
};

export default function SavedPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        <T k="saved.title" />
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        <T k="saved.intro" />
      </p>
      <div className="mt-6">
        <SavedList />
      </div>
    </main>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ArchiveBrowser from "@/components/ArchiveBrowser";
import { T } from "@/i18n/T";

export const metadata = {
  title: "Archive — DPRK Media Mirror",
  description:
    "Search the full 1.37M-article KCNA Watch archive and browse the latest articles back to ~2015.",
};

export default function ArchivePage() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/news" className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> <T k="archive.allNews" />
        </Link>
        <h1 className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">
          <T k="archive.title" />
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          <T k="archive.intro" />
        </p>
      </div>
      <ArchiveBrowser />
    </div>
  );
}

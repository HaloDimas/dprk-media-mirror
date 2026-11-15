import Link from "next/link";
import ArchiveBrowser from "@/components/ArchiveBrowser";

export const metadata = {
  title: "Archive — DPRK Media Mirror",
  description:
    "Search the full 1.37M-article KCNA Watch archive and browse the latest articles back to ~2015.",
};

export default function ArchivePage() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/news" className="text-sm text-red-400 hover:underline">
          ← All news
        </Link>
        <h1 className="mt-2 text-xl font-bold text-white">KCNA Watch Archive</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-400">
          The full KCNA Watch archive — 1.37 million articles back to 2016, searchable, plus a
          browseable list back to ~2015. Every result opens in full on this site&apos;s own article
          pages when the mirror&apos;s KCNA Watch session is live; if the session has expired, the
          excerpt is shown instead.
        </p>
      </div>
      <ArchiveBrowser />
    </div>
  );
}

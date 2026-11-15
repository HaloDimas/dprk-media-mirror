import { Suspense } from "react";
import GlobalSearch from "@/components/GlobalSearch";

export const metadata = {
  title: "Search — DPRK Media Mirror",
  description:
    "Search everything on the mirror: news articles, recordings, publications, programme guides and the directory of DPRK websites — with filters.",
};

export default function SearchPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Search the Mirror</h1>
        <p className="mt-1 text-sm text-zinc-400">
          One search across news, recordings, publications, the programme guide and the directory.
          Filter by type, date, channel, category, source or language.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading search…</p>}>
        <GlobalSearch />
      </Suspense>
    </div>
  );
}

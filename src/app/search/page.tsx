import { Suspense } from "react";
import GlobalSearch from "@/components/GlobalSearch";
import { T } from "@/i18n/T";

export const metadata = {
  title: "Search — DPRK Media Mirror",
  description:
    "Search everything on the mirror: news articles, recordings, publications, programme guides and the directory of DPRK websites — with filters.",
};

export default function SearchPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          <T k="search.title" />
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          <T k="search.intro" />
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400"><T k="loading.search" /></p>}>
        <GlobalSearch />
      </Suspense>
    </div>
  );
}

import DirectoryBrowser from "@/components/DirectoryBrowser";
import { DIRECTORY, DIRECTORY_TOTAL } from "@/data/directory";
import { T } from "@/i18n/T";

export const metadata = {
  title: "Directory — DPRK Media Mirror",
  description:
    "A directory of North Korean official websites: news and newspapers, government institutions, education, culture, tourism and business.",
};

export default function DirectoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          <T k="directory.title" />
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          <T k="directory.intro" values={{ total: DIRECTORY_TOTAL }} />
        </p>
      </div>

      <DirectoryBrowser categories={DIRECTORY} total={DIRECTORY_TOTAL} />

      <p className="border-t border-zinc-200 dark:border-zinc-800 pt-4 text-xs text-zinc-500">
        <T k="directory.footnote" />
      </p>
    </div>
  );
}

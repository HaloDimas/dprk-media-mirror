import DirectoryBrowser from "@/components/DirectoryBrowser";
import { DIRECTORY, DIRECTORY_TOTAL } from "@/data/directory";

export const metadata = {
  title: "Directory — DPRK Media Mirror",
  description:
    "A directory of North Korean official websites: news and newspapers, government institutions, education, culture, tourism and business.",
};

export default function DirectoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Directory of DPRK Websites</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          {DIRECTORY_TOTAL} official North Korean websites, grouped by category. This is an informational
          directory — the live TV, radio, news, recordings and publications on this mirror are read and
          watched on this site&apos;s own pages, not by opening the listed sites. &ldquo;Live&rdquo;
          means the site returned HTTP 200 when checked on 15 Nov 2026; &ldquo;Active domain,
          unreachable here&rdquo; means the domain is on the July 2026 active .kp list but did not
          answer from our network (the .kp origin is flaky — retry later). Note: .kp sites only work
          over plain HTTP, not HTTPS.
        </p>
      </div>

      <DirectoryBrowser categories={DIRECTORY} total={DIRECTORY_TOTAL} />

      <p className="border-t border-zinc-200 dark:border-zinc-800 pt-4 text-xs text-zinc-500">
        Domains are taken from the July 2026 active .kp domains list and live-checked on 15 Nov 2026.
        Nothing in this directory is a link out to read or watch content — use Live TV, Schedule, News,
        Radio, Recordings and Publications above for that.
      </p>
    </div>
  );
}

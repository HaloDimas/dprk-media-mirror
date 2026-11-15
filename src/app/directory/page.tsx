import { DIRECTORY, DIRECTORY_TOTAL, type DirectoryStatus } from "@/data/directory";

export const metadata = {
  title: "Directory — DPRK Media Mirror",
  description:
    "A directory of North Korean official websites: news and newspapers, government institutions, education, culture, tourism and business.",
};

function StatusBadge({ status }: { status: DirectoryStatus }) {
  if (status === "active")
    return (
      <span className="rounded bg-emerald-900/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
        ● Active (July 2026 list)
      </span>
    );
  if (status === "mail-only")
    return (
      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
        ✉ Mail server only
      </span>
    );
  if (status === "likely-offline")
    return (
      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">
        ○ Unconfirmed / likely offline
      </span>
    );
  if (status === "unconfirmed")
    return (
      <span className="rounded bg-amber-900/70 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
        ? URL not confirmed
      </span>
    );
  return (
    <span className="rounded bg-amber-900/70 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
        ◌ Checking…
      </span>
  );
}

export default function DirectoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Directory of DPRK Websites</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-400">
          {DIRECTORY_TOTAL} official North Korean websites, grouped by category. This is an informational
          directory — the live TV, radio, news, recordings and publications on this mirror are read and
          watched on this site&apos;s own pages, not by opening the listed sites. &ldquo;Active&rdquo;
          means the domain appears on the July 2026 active .kp domains list; it does not claim the site
          is reachable from every network.
        </p>
      </div>

      {DIRECTORY.map((cat) => (
        <section key={cat.id}>
          <h2 className="text-lg font-bold text-white">{cat.title}</h2>
          <p className="mt-0.5 text-sm text-zinc-500">{cat.blurb}</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cat.entries.map((entry) => (
              <li
                key={entry.name}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-100">{entry.name}</h3>
                  <StatusBadge status={entry.status} />
                </div>
                {entry.description && (
                  <p className="mt-1 text-sm text-zinc-400">{entry.description}</p>
                )}
                <p className="mt-2 font-mono text-xs text-zinc-500">
                  {entry.url ? entry.url : "URL pending verification"}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-600">{cat.title}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="border-t border-zinc-800 pt-4 text-xs text-zinc-500">
        Domains are taken from the July 2026 active .kp domains list. Nothing in this directory is a link
        out to read or watch content — use Live TV, Schedule, News, Radio, Recordings and Publications
        above for that.
      </p>
    </div>
  );
}

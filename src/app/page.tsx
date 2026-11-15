import Link from "next/link";
import { connection } from "next/server";
import HlsPlayer from "@/components/HlsPlayer";
import { getAllNews, getEpg } from "@/lib/sources";
import { findNowNext, nowPyt, todayPyt } from "@/lib/types";

// This page depends on the current time, so it renders at request time.
export const instant = false;

export default async function Home() {
  // "Today" depends on the current time, so this page renders per request.
  await connection();
  const [epg, news] = await Promise.all([
    getEpg("kctv", todayPyt()),
    getAllNews(),
  ]);
  const { now, next } = findNowNext(epg.programs, nowPyt());
  const latest = news.slice(0, 6);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-3">
          <h1 className="text-xl font-bold text-white">KCTV Live — 조선중앙텔레비죤</h1>
          <span className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
            ● Live
          </span>
          {epg.source === "snapshot" && (
            <span className="text-xs text-amber-300">Guide snapshot — live guide unreachable</span>
          )}
        </div>
        <HlsPlayer channel="kctv" title="KCTV Live" />
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm">
          {now ? (
            <p>
              <span className="font-semibold text-red-400">Now:</span>{" "}
              <span className="text-zinc-100">
                {now.en} <span className="text-zinc-500">({now.start} – {now.end})</span>
              </span>
            </p>
          ) : (
            <p className="text-zinc-400">KCTV is off air at this hour — see the schedule for broadcast times.</p>
          )}
          {next && (
            <p className="mt-1">
              <span className="font-semibold text-zinc-300">Next:</span>{" "}
              <span className="text-zinc-100">
                {next.en} <span className="text-zinc-500">({next.start} – {next.end})</span>
              </span>
            </p>
          )}
          <p className="mt-2">
            <Link href="/schedule" className="text-red-400 hover:underline">
              Full programme guide →
            </Link>
          </p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-white">Latest News</h2>
          <Link href="/news" className="text-sm text-red-400 hover:underline">
            All news →
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-400">
            News is temporarily unavailable. Please try again later.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {latest.map((it) => (
              <li key={it.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
                <Link href={`/news/${it.id}`} className="flex gap-3 p-4 hover:bg-zinc-800/50">
                  {it.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt="" className="hidden h-16 w-24 shrink-0 rounded-md object-cover sm:block" />
                  )}
                  <div className="min-w-0">
                    <div className="flex gap-2 text-xs">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{it.source}</span>
                      <span className="text-zinc-500">{it.date}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-medium leading-snug text-zinc-100">{it.title}</h3>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Explore</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/live", title: "Live TV", desc: "KCTV, Athletic TV and Ryongnamsan TV, live in this site's own player." },
            { href: "/schedule", title: "Programme Guide", desc: "The full schedule for all four TV channels, by date." },
            { href: "/radio", title: "Radio", desc: "KCBS, KCBS-2 and Pyongyang FM, streaming here." },
            { href: "/recordings", title: "Recordings", desc: "8pm News, Revolutionary Activities and Society & Culture archives." },
            { href: "/publications", title: "Publications", desc: "The Pyongyang Times, DPR Korea and Kumsugangsan — read the PDFs here." },
            { href: "/news", title: "News", desc: "KCNA articles in full, plus the latest KCNA Watch headlines." },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-red-700 hover:bg-zinc-800/60"
            >
              <h3 className="font-semibold text-zinc-100">{c.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

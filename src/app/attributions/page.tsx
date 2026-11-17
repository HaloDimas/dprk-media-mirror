import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { T } from "@/i18n/T";

export const metadata = { title: "Source attributions — DPRK Media Mirror" };

/** The sources this mirror is built on — the same mirrored list as the
 *  /sources page, with the actual upstream URL for each. .kp sites only
 *  work over plain HTTP (port 80), so their links are http://; the
 *  https:// sites link over HTTPS. Source names and "provides" text
 *  stay in English (source data); only the page chrome is translated. */
type Attribution = {
  name: string;
  provides: string;
  href: string;
  external?: boolean;
};

const STREAMS: Attribution[] = [
  {
    name: "Koryo Front",
    provides: "KCTV / Sports / Ryongnamsan EPG, live HLS, recordings, publications",
    href: "https://koryofront.org",
    external: true,
  },
  {
    name: "KCTV · Athletic TV · Ryongnamsan TV · Mansudae TV",
    provides: "Live TV channels + programme guides",
    href: "/live",
  },
];

const NEWS: Attribution[] = [
  {
    name: "KCNA — Korean Central News Agency",
    provides: "Official KCNA wire, English articles in full",
    href: "http://www.kcna.kp/en/",
    external: true,
  },
  {
    name: "Rodong Sinmun",
    provides: "WPK daily newspaper, Korean articles in full",
    href: "http://www.rodong.rep.kp/ko/",
    external: true,
  },
  {
    name: "Minju Joson",
    provides: "Cabinet / SPA Presidium newspaper, Korean headlines",
    href: "http://www.minju.rep.kp/",
    external: true,
  },
  {
    name: "The Pyongyang Times",
    provides: "Only English-language newspaper (weekly), English articles in full",
    href: "http://www.pyongyangtimes.com.kp/",
    external: true,
  },
  {
    name: "Naenara",
    provides: "Government portal, Korean headlines + periodicals",
    href: "http://www.naenara.com.kp/",
    external: true,
  },
  {
    name: "Youth Sinmun",
    provides: "Youth newspaper, Korean headlines",
    href: "http://www.youth.rep.kp/",
    external: true,
  },
  {
    name: "Ryugyong",
    provides: "Ryugyong Programming Center, photo and video items",
    href: "http://mediaryugyong.com.kp/",
    external: true,
  },
  {
    name: "Voice of Korea",
    provides: "International shortwave radio, Korean articles in full",
    href: "http://www.vok.rep.kp/",
    external: true,
  },
  {
    name: "Korean Architecture",
    provides: "Heritage and construction projects, English articles in full",
    href: "http://koreanarchitecture.gov.kp/",
    external: true,
  },
  {
    name: "Korean Stamp",
    provides: "New stamp issues — stock numbers, dates, PDFs",
    href: "http://korstamp.com.kp/",
    external: true,
  },
  {
    name: "KNS — Korean News Service",
    provides: "English KCNA wire, full text",
    href: "https://koreanewsservice.com",
    external: true,
  },
  {
    name: "KCNA Watch",
    provides: "English KCNA archive, excerpts only",
    href: "https://kcnawatch.org",
    external: true,
  },
];

function AttributionCard({ a }: { a: Attribution }) {
  return (
    <li className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4 transition-colors hover:border-red-800">
      <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{a.name}</h3>
      <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">{a.provides}</p>
      {a.external ? (
        <a
          href={a.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
        >
          <T k="attributions.visitSource" />
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-xs text-zinc-500">{a.href}</span>
        </a>
      ) : (
        <Link
          href={a.href}
          className="mt-2 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
        >
          <T k="attributions.visitSource" />
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </li>
  );
}

export default function AttributionsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        <T k="attributions.title" />
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
        <T k="attributions.intro" />
      </p>

      <h2 className="mt-8 border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        <T k="attributions.streams" />
      </h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {STREAMS.map((a) => (
          <AttributionCard key={a.name} a={a} />
        ))}
      </ul>

      <h2 className="mt-10 border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        <T k="attributions.news" />
      </h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {NEWS.map((a) => (
          <AttributionCard key={a.name} a={a} />
        ))}
      </ul>
    </main>
  );
}

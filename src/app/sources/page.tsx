import Link from "next/link";

export const metadata = { title: "Mirrored sources — DPRK Media Mirror" };

type Source = {
  name: string;
  provides: string;
  status: "live" | "flaky" | "partial" | "not-used";
  note: string;
  href?: string;
};

const MIRRORED: Source[] = [
  {
    name: "KCNA — Korean Central News Agency",
    provides: "Official KCNA wire, English articles in full",
    status: "live",
    note: "The official wire itself. Latest English articles with full body text on our article pages.",
    href: "/news",
  },
  {
    name: "Rodong Sinmun",
    provides: "WPK daily newspaper, Korean articles in full",
    status: "flaky",
    note: "The Party's daily. Latest Korean articles with full text; the origin is sometimes slow or empty — we retry.",
    href: "/news",
  },
  {
    name: "Minju Joson",
    provides: "Cabinet / SPA Presidium newspaper, Korean headlines",
    status: "partial",
    note: "Government affairs, laws and regulations. Headlines and dates are mirrored; its article pages return the article list instead of the article, so full text cannot be fetched.",
    href: "/news",
  },
  {
    name: "The Pyongyang Times",
    provides: "Only English-language newspaper (weekly), English articles in full",
    status: "live",
    note: "Latest English articles with full body text on our article pages.",
    href: "/news",
  },
  {
    name: "Naenara",
    provides: "Government portal, Korean headlines + periodicals",
    status: "partial",
    note: "Multilingual portal (Pyongyang Times, Korea, Korea Today, Foreign Trade). Headlines and dates are mirrored; articles load through a hash-based viewer, so full text cannot be fetched server-side.",
    href: "/news",
  },
  {
    name: "Youth Sinmun",
    provides: "Youth newspaper, Korean headlines",
    status: "partial",
    note: "Headlines and dates are mirrored; its article pages return a server error (HTTP 500), so full text cannot be fetched.",
    href: "/news",
  },
  {
    name: "Ryugyong",
    provides: "Ryugyong Programming Center, photo and video items",
    status: "live",
    note: "Photo and video of DPRK events. Revolutionary-activity photo items are mirrored with their photos; it is a photo site, so there is no article text.",
    href: "/news",
  },
  {
    name: "Voice of Korea",
    provides: "International shortwave radio, Korean articles in full",
    status: "live",
    note: "Programme news articles in full. No audio file links were found in its homepage, so audio is not mirrored — programme text only.",
    href: "/news",
  },
  {
    name: "Korean Architecture",
    provides: "Heritage and construction projects, English articles in full",
    status: "live",
    note: "Latest English articles with full body text on our article pages.",
    href: "/news",
  },
  {
    name: "Korean Stamp",
    provides: "New stamp issues — stock numbers, dates, PDFs",
    status: "live",
    note: "Latest new-issue stamps with stock numbers and PDF downloads, shown on the Publications page.",
    href: "/publications",
  },
  {
    name: "KNS — Korean News Service",
    provides: "English KCNA wire, full text",
    status: "live",
    note: "English KCNA articles with full body text and photos, via the Koryo Front news API.",
    href: "/news",
  },
  {
    name: "KCNA Watch",
    provides: "English KCNA archive, excerpts only",
    status: "partial",
    note: "Latest headlines with the published excerpt. Full article bodies sit behind a free-member signup wall and cannot be fetched, so they are not mirrored.",
    href: "/news",
  },
  {
    name: "Koryo Front",
    provides: "KCTV / Sports / Ryongnamsan EPG, live HLS, recordings, publications",
    status: "live",
    note: "The backbone of this mirror: programme guides, live TV and radio streams, the recording catalogue and the publication library.",
    href: "/live",
  },
  {
    name: "KCTV · Athletic TV · Ryongnamsan TV · Mansudae TV",
    provides: "Live TV channels + programme guides",
    status: "live",
    note: "KCTV, Athletic (Sports) and Ryongnamsan stream live; Mansudae has no stream or guide anywhere and is listed as Coming Soon. Ryongnamsan only broadcasts on weekdays.",
    href: "/live",
  },
];

const NOT_MIRRORED: Source[] = [
  {
    name: "Uriminzokkiri · Tongil Voice · National Unity · Friend",
    provides: "—",
    status: "not-used",
    note: "Confirmed dead — their domains no longer serve anything.",
  },
  {
    name: "Korea Tourism (older domain) · Masikryong Ski Resort",
    provides: "—",
    status: "not-used",
    note: "Confirmed dead.",
  },
  {
    name: "Sogwang",
    provides: "—",
    status: "not-used",
    note: "Not a website — it is the Red Star OS office suite / media corporation.",
  },
  {
    name: "Koryo TV",
    provides: "—",
    status: "not-used",
    note: "Not used: its streams are session-based (a fresh random playlist per load) and its on-site schedule is stale (October 2026). Koryo Front covers the same channels reliably.",
  },
  {
    name: "DPRK Portal (KwangYa)",
    provides: "—",
    status: "not-used",
    note: "The official directory — its data is already in our Directory page, so no separate mirror is needed.",
  },
];

const STATUS_LABEL: Record<Source["status"], { text: string; cls: string }> = {
  live: { text: "Live — verified 15 Nov 2026", cls: "bg-emerald-900/70 text-emerald-200" },
  flaky: { text: "Live — flaky, retries on", cls: "bg-amber-900/70 text-amber-200" },
  partial: { text: "Partially mirrored", cls: "bg-amber-900/70 text-amber-200" },
  "not-used": { text: "Not mirrored", cls: "bg-zinc-800 text-zinc-400" },
};

function SourceCard({ s }: { s: Source }) {
  const st = STATUS_LABEL[s.status];
  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-medium text-zinc-100">{s.name}</h2>
        <span className={`rounded px-2 py-0.5 text-xs ${st.cls}`}>{st.text}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-red-400">{s.provides}</p>
      <p className="mt-1 text-sm text-zinc-400">{s.note}</p>
    </>
  );
  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-red-800">
      {s.href ? (
        <Link href={s.href} className="block">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </li>
  );
}

export default function SourcesPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold text-zinc-100">Mirrored sources</h1>
      <p className="mt-2 max-w-3xl text-sm text-zinc-400">
        Every North Korean source this site mirrors, what it provides, and its live status. All .kp
        sites only work over plain HTTP (port 80) — HTTPS returns nothing — and the origin is
        flaky/intermittent, so every .kp fetch is retried and cached; if a source is unreachable the
        page still shows the other sources. All content is served from this site — nothing here links
        out to a source site for reading or watching.
      </p>

      <h2 className="mt-8 border-l-4 border-red-700 pl-3 text-lg font-semibold text-zinc-100">
        Mirrored ({MIRRORED.length})
      </h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {MIRRORED.map((s) => (
          <SourceCard key={s.name} s={s} />
        ))}
      </ul>

      <h2 className="mt-10 border-l-4 border-zinc-600 pl-3 text-lg font-semibold text-zinc-100">
        Not mirrored — dead, not a website, or already covered
      </h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {NOT_MIRRORED.map((s) => (
          <SourceCard key={s.name} s={s} />
        ))}
      </ul>
    </main>
  );
}

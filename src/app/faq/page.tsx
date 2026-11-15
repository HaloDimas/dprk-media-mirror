import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ — DPRK Media Mirror",
  description: "Frequently asked questions about the DPRK Media Mirror.",
};

const QA: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is DPRK Media Mirror?",
    a: (
      <>
        A single, independent mirror of North Korean state media: live KCTV, Athletic TV and
        Ryongnamsan TV, KCBS radio, the full programme guide, KCNA news, recordings and
        publications — all readable and watchable on this site, without being sent to other
        websites. It is not affiliated with the DPRK government, Koryo Front, or KCNA Watch.
      </>
    ),
  },
  {
    q: "Is the TV and radio really live?",
    a: (
      <>
        Yes. The player streams the live HLS feeds through this site&apos;s own proxy. If a
        stream stalls or drops, the player now retries automatically (up to 5 times) instead of
        asking you to refresh the page.
      </>
    ),
  },
  {
    q: "Why does a page sometimes take a few seconds to load?",
    a: (
      <>
        The mirror fetches its data from the source sites (many of them hosted in North Korea) and
        some of them answer very slowly — Rodong Sinmun in particular can take 8 seconds or more.
        The page shell loads immediately and the news fills in when it is ready; Rodong articles
        load in the background and appear afterwards.
      </>
    ),
  },
  {
    q: "Why is Korean Central Broadcasting Station (KCBS) so quiet?",
    a: (
      <>
        The KCBS broadcast itself is about 40 dB quieter than the other stations — it is not a
        player bug. Use the <strong>Boost ×2</strong> button on the radio player, and raise your
        device volume if needed.
      </>
    ),
  },
  {
    q: "Why do some articles say “Excerpt only”?",
    a: (
      <>
        Some articles come from KCNA Watch, whose full text requires a free account and a live
        session. When the session is unavailable the mirror shows the excerpt and a link to the
        original article. Articles from KCNA, Rodong Sinmun, Pyongyang Times, Voice of Korea and
        Korean Architecture are mirrored in full. See the{" "}
        <Link href="/sources" className="text-red-400 underline hover:text-red-300">
          Sources page
        </Link>{" "}
        for what each source provides.
      </>
    ),
  },
  {
    q: "What time zone are the programme times in?",
    a: (
      <>
        All programme times are <strong>Pyongyang Time (UTC+9)</strong>. The schedule pages and
        the “Now on air” card already show Pyongyang Time.
      </>
    ),
  },
  {
    q: "Can I download the recordings?",
    a: (
      <>
        Yes — recordings play here, and the files themselves are hosted by the source (Dropbox
        links from Koryo Front). Use the download control on the recording&apos;s page.
      </>
    ),
  },
  {
    q: "Do I need an account?",
    a: (
      <>
        No. There are no accounts, no sign-in, and nothing to subscribe to. Everything on the
        mirror is free to read and watch.
      </>
    ),
  },
  {
    q: "Why is a channel missing from the guide, or marked “Coming Soon”?",
    a: (
      <>
        Mansudae TV has no published programme guide or stream anywhere we could find, so it is
        listed as Coming Soon. Ryongnamsan TV only broadcasts on weekdays, so its guide is empty
        on Saturdays and Sundays.
      </>
    ),
  },
  {
    q: "Is this site affiliated with the North Korean government?",
    a: (
      <>
        No. It is an independent mirror built from publicly available feeds. The content belongs
        to its original broadcasters and publishers; see the{" "}
        <Link href="/terms" className="text-red-400 underline hover:text-red-300">
          Terms &amp; Conditions
        </Link>{" "}
        for attribution.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-white">Frequently Asked Questions</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Answers to the questions people ask most about the mirror. If yours is not here, see the{" "}
        <Link href="/contact" className="text-red-400 underline hover:text-red-300">
          Contact page
        </Link>
        .
      </p>
      <div className="mt-6 space-y-6">
        {QA.map((item) => (
          <section key={item.q}>
            <h2 className="text-base font-semibold text-white">{item.q}</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">{item.a}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

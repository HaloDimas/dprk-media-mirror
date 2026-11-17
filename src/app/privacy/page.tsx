import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — DPRK Media Mirror",
  description: "How DPRK Media Mirror handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Last updated: 17 November 2026.</p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">Short version</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        This site has no accounts, no sign-in, and no tracking of who you are. It does not set
        cookies for you, does not run advertising, and does not sell or share personal data —
        because it does not collect any. The only measurement is Vercel Analytics and Speed
        Insights (see below), which count page visits and loading speed without cookies and
        without identifying you.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">What we do not collect</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <li>No accounts, usernames, email addresses, or passwords.</li>
        <li>No advertising or third-party tracking scripts.</li>
        <li>No cookies set by this site in your browser.</li>
        <li>No payment information — nothing on this site is sold.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">Analytics (Vercel)</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        The site uses Vercel Analytics and Speed Insights, the hosting provider&apos;s own
        measurement tools, to see which pages are visited and how fast they load. They do not
        use cookies, do not collect personal identifiers, and do not track you across other
        sites. This mirror does not read, combine, or use that data to identify individual
        visitors.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">What the hosting provider sees</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        The site is hosted on Vercel. Like any web host, Vercel necessarily receives the standard
        technical data your browser sends with every request (your IP address, the page requested,
        and the time) in its server logs, which it uses for security, abuse prevention, and
        keeping the site running. This mirror does not read, combine, or use those logs to
        identify individual visitors.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">What the site fetches on your behalf</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Live TV, radio, news, and publications are fetched server-side from the source sites
        (Koryo Front, KCNA Watch, and the .kp domains listed on the{" "}
        <Link href="/sources" className="text-red-600 dark:text-red-400 underline hover:text-red-700 dark:hover:text-red-300">
          Sources page
        </Link>
        ) and served to you from this site. Your browser does not contact those source sites
        directly for reading or watching — except when you deliberately click a link that leaves
        this site, such as the “Read the full article on the original site” button on excerpt-only
        articles, or the “Watch on Koryo TV” button. Those destinations have their own privacy
        policies.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">External links</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        A few pages link out — to the project&apos;s public GitHub repository (for contact and
        issue reports) and, where a full article cannot be mirrored, to the original article. This
        policy does not cover those sites.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">Changes</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        If this policy changes, the “Last updated” date above will change. Questions about it can
        be raised on the{" "}
        <Link href="/contact" className="text-red-600 dark:text-red-400 underline hover:text-red-700 dark:hover:text-red-300">
          Contact page
        </Link>
        .
      </p>
    </div>
  );
}

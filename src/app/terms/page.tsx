import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions — DPRK Media Mirror",
  description: "Terms of use for the DPRK Media Mirror.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Last updated: 15 November 2026.</p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        By using this site, you agree to these Terms &amp; Conditions.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">What this site is</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        DPRK Media Mirror is an independent, non-commercial mirror of publicly available North
        Korean state media. It aggregates live TV and radio, programme guides, news, recordings,
        and publications from Koryo Front, KCNA Watch, and the official .kp domains listed on the{" "}
        <Link href="/sources" className="text-red-600 dark:text-red-400 underline hover:text-red-700 dark:hover:text-red-300">
          Sources page
        </Link>
        , and presents them on one site. It is not affiliated with, endorsed by, or connected to
        the government of the Democratic People&apos;s Republic of Korea, Koryo Front, KCNA Watch,
        or any of the original publishers.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">Ownership of content</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        All articles, broadcasts, recordings, publications, images, and programme data belong to
        their original broadcasters and publishers (including KCNA, Korean Central Television,
        Rodong Sinmun, Pyongyang Times, Voice of Korea, and the other sources named on this site).
        This mirror does not claim ownership of that content. It is reproduced here for
        information, research, and archival purposes. If you own content mirrored here and want
        it corrected or removed, see the{" "}
        <Link href="/contact" className="text-red-600 dark:text-red-400 underline hover:text-red-700 dark:hover:text-red-300">
          Contact page
        </Link>
        .
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">Acceptable use</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <li>Use the site for personal reading, watching, and research.</li>
        <li>Do not use it to impersonate the mirror, the original broadcasters, or any government.</li>
        <li>Do not scrape, bulk-download, or re-publish the mirrored content as your own.</li>
        <li>Do not attempt to disrupt the site, its proxy, or the upstream sources.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">No warranty</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        The site is provided “as is”, without any warranty. Live streams, programme guides, and
        news depend on upstream sources that are often slow, intermittent, or temporarily
        unavailable — especially the .kp domains. The mirror cannot guarantee that any stream,
        article, or schedule is complete, current, or uninterrupted. Programme times are shown as
        published by the source, in Pyongyang Time (UTC+9).
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">Liability</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        To the fullest extent permitted by law, the operator is not liable for any loss or damage
        arising from your use of, or inability to use, this site — including missed broadcasts,
        incomplete or outdated information, or reliance on mirrored content.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">External links</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Some pages link to external sites (for example, the original article for excerpt-only
        pieces, or Koryo TV when a stream cannot be embedded). This site is not responsible for
        the content, availability, or privacy practices of external sites.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">Changes</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        These terms may change; the “Last updated” date above will change with them. Continued
        use of the site after a change means you accept the updated terms.
      </p>
    </div>
  );
}

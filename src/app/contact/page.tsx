import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact — DPRK Media Mirror",
  description: "How to reach the operator of the DPRK Media Mirror.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-white">Contact</h1>
      <p className="mt-2 text-sm text-zinc-400">
        DPRK Media Mirror is an independent, non-commercial mirror run by one person. There is no
        support team and no account system — but reports about the site are welcome.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-white">What to report</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-300">
        <li>A live TV or radio stream that will not play, or keeps failing.</li>
        <li>A programme guide that is wrong, missing, or stuck on an old date.</li>
        <li>A news article that shows the wrong text, or a broken recording/publication link.</li>
        <li>A source site that has moved, changed its address, or gone offline.</li>
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-zinc-300">
        Before reporting a stream problem, check the{" "}
        <Link href="/status" className="text-red-400 underline hover:text-red-300">
          Status page
        </Link>{" "}
        — it shows which sources are currently up, down, or slow. Many outages come from the
        upstream source itself, not from this mirror.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-white">How to reach us</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
        The fastest way is to open an issue on the project&apos;s public repository, where the
        mirror&apos;s code lives:
      </p>
      <p className="mt-2">
        <a
          href="https://github.com/HaloDimas/dprk-media-mirror/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-red-400 underline hover:text-red-300"
        >
          github.com/HaloDimas/dprk-media-mirror — Issues ↗
        </a>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-300">
        Please include the page you were on, what you expected, and what you saw instead. Do not
        send passwords, session cookies, or any other credentials — the operator will never ask
        for them.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-white">Content owners</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
        If you own content mirrored here and want it corrected or removed, open an issue on the
        repository above with a link to the page and proof of ownership. See the{" "}
        <Link href="/terms" className="text-red-400 underline hover:text-red-300">
          Terms &amp; Conditions
        </Link>{" "}
        for how mirrored content is attributed.
      </p>
    </div>
  );
}

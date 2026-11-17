"use client";

import { ArrowUpRight } from "lucide-react";
import { DICTS, useLanguage } from "@/i18n/LanguageContext";
import { Rich, T } from "@/i18n/T";

/** /contact body — rendered from the contact dictionary section so the
 *  whole page switches language with the UI. */
export default function ContactContent() {
  const { lang } = useLanguage();
  const c = DICTS[lang].contact;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
        <T k="contact.title" />
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        <T k="contact.intro" />
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">
        <T k="contact.whatToReport" />
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {c.reportItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <Rich text={c.beforeReporting} />
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">
        <T k="contact.howToReach" />
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <T k="contact.reachText" />
      </p>
      <p className="mt-2">
        <a
          href="mailto:atsushi@tutanota.com"
          className="text-sm font-medium text-red-600 dark:text-red-400 underline hover:text-red-700 dark:hover:text-red-300"
        >
          atsushi@tutanota.com
        </a>
      </p>
      <p className="mt-2">
        <a
          href="https://github.com/HaloDimas/dprk-media-mirror/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-red-600 dark:text-red-400 underline hover:text-red-700 dark:hover:text-red-300"
        >
          github.com/HaloDimas/dprk-media-mirror — Issues
          <ArrowUpRight className="ml-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
        </a>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <T k="contact.includeText" />
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">
        <T k="contact.contentOwners" />
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <Rich text={c.ownersText} />
      </p>
    </div>
  );
}

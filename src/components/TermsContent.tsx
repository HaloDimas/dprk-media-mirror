"use client";

import { DICTS, useLanguage } from "@/i18n/LanguageContext";
import { Rich, T } from "@/i18n/T";

/** /terms body — rendered from the terms dictionary section
 *  (heading + paragraphs + optional bullets per section). */
export default function TermsContent() {
  const { lang } = useLanguage();
  const t = DICTS[lang].terms;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
        <T k="terms.title" />
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        <T k="terms.lastUpdated" />
      </p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <T k="terms.acceptance" />
      </p>

      {t.sections.map((s) => (
        <section key={s.h}>
          <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">{s.h}</h2>
          {s.p.map((para, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              <Rich text={para} />
            </p>
          ))}
          {s.bullets && s.bullets.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {s.bullets.map((b) => (
                <li key={b}>
                  <Rich text={b} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

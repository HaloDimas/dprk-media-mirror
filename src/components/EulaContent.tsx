"use client";

import { DICTS, useLanguage } from "@/i18n/LanguageContext";
import { T } from "@/i18n/T";

/** /eula body — mirrors TermsContent, but for the End User License
 *  Agreement. The legal text itself stays in English; only the title,
 *  intro and "Last updated" line are translated. */
export default function EulaContent() {
  const { lang } = useLanguage();
  const d = DICTS[lang].eula;

  return (
    <div className="prose max-w-none">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
        <T k="eula.title" />
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <T k="eula.lastUpdated" />
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <T k="eula.intro" />
      </p>
      {d.sections.map((s) => (
        <section key={s.h} className="mt-8">
          <h2 className="section-title text-lg">{s.h}</h2>
          {s.p.map((para, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {para}
            </p>
          ))}
          {s.bullets && (
            <ul className="mt-2 space-y-1 pl-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {s.bullets.map((b, i) => (
                <li key={i} className="list-disc">
                  {b}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

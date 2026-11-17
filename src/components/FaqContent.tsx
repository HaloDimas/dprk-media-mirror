"use client";

import { DICTS, useLanguage } from "@/i18n/LanguageContext";
import { Rich, T } from "@/i18n/T";

/** /faq body — rendered from the faq dictionary section. Answers may
 *  contain **bold** markers and [[link]] tokens, rendered by <Rich>. */
export default function FaqContent() {
  const { lang } = useLanguage();
  const f = DICTS[lang].faq;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
        <T k="faq.title" />
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        <Rich text={f.intro} />
      </p>
      <div className="mt-6 space-y-6">
        {f.items.map((item) => (
          <section key={item.q}>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{item.q}</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              <Rich text={item.a} />
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

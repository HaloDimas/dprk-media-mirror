"use client";

import { useLanguage } from "@/i18n/LanguageContext";
import { Rich, T } from "@/i18n/T";

/** "How this works" on /status — a client component because how3
 *  contains a [[mirroredSources]] link token rendered by <Rich>. */
export default function StatusHow() {
  const { t } = useLanguage();
  return (
    <section className="mt-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4 text-sm text-zinc-600 dark:text-zinc-400">
      <h2 className="font-semibold text-zinc-900 dark:text-white">
        <T k="status.howItWorks" />
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <Rich text={t("status.how1")} />
        </li>
        <li>
          <Rich text={t("status.how2")} />
        </li>
        <li>
          <Rich text={t("status.how3")} />
        </li>
      </ul>
    </section>
  );
}

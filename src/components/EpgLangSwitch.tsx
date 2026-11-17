"use client";

import { useEffect, useState } from "react";
import {
  getEpgLangSetting,
  setEpgLangSetting,
  SETTINGS_CHANGED_EVENT,
  type EpgLangSetting,
} from "@/lib/settings";
import { useLanguage } from "@/i18n/LanguageContext";

/** Compact Auto / English / 한국어 segmented control for programme
 *  titles. The choice is stored in localStorage ("dprk-epg-lang");
 *  "auto" follows the UI language. Used on the Schedule page, the
 *  Live TV NOW ON AIR card, and the Settings page — one shared setting. */
export default function EpgLangSwitch({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const [setting, setSetting] = useState<EpgLangSetting>("auto");

  useEffect(() => {
    setSetting(getEpgLangSetting());
    const onChange = () => setSetting(getEpgLangSetting());
    window.addEventListener(SETTINGS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, onChange);
  }, []);

  const options: { id: EpgLangSetting; label: string }[] = [
    { id: "auto", label: t("epg.auto") },
    { id: "en", label: t("epg.english") },
    { id: "ko", label: t("epg.korean") },
  ];

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5" role="group" aria-label={t("epg.label")}>
      <span className={compact ? "hidden text-xs text-zinc-500 sm:inline" : "text-xs font-medium text-zinc-600 dark:text-zinc-400"}>
        {t("epg.label")}:
      </span>
      <div className="inline-flex overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setEpgLangSetting(o.id)}
            aria-pressed={setting === o.id}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              setting === o.id
                ? "bg-red-700 text-white"
                : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

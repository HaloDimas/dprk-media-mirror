"use client";

import { Bookmark } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSaved, type SavedItem } from "@/lib/saved";

/** Bookmark toggle for one article or recording. The icon fills when
 *  the item is saved; state lives in localStorage (dprk-saved) and
 *  syncs across every button on the page via the saved-changed event. */
export default function SaveButton({ item, className }: { item: SavedItem; className?: string }) {
  const { t } = useLanguage();
  const { savedIds, toggle } = useSaved();
  const saved = savedIds.has(item.id);
  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      aria-pressed={saved}
      aria-label={saved ? t("saved.unsaveAria", { title: item.title }) : t("saved.saveAria", { title: item.title })}
      title={saved ? t("saved.savedLabel") : t("saved.save")}
      className={
        className ??
        "inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:border-red-600 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-400"
      }
    >
      <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} aria-hidden="true" />
      <span className="hidden sm:inline">{saved ? t("saved.savedLabel") : t("saved.save")}</span>
    </button>
  );
}

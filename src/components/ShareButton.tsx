"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/** Copy a link to the clipboard and show a brief confirmation.
 *  No third-party share SDKs. `url` defaults to the current page
 *  URL — callers pass an explicit URL for items (e.g. a recording's
 *  file URL). Falls back to a hidden textarea + execCommand when the
 *  async clipboard API is unavailable or denied. */
export default function ShareButton({ url, className }: { url?: string; className?: string }) {
  const { t } = useLanguage();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const copy = useCallback(async () => {
    const text = url ?? window.location.href;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Fallback for browsers without the async clipboard API.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    setState(ok ? "copied" : "failed");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState("idle"), 2000);
  }, [url]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t("share.copyLink")}
      title={t("share.copyLink")}
      className={
        className ??
        "inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:border-red-600 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-400"
      }
    >
      {state === "copied" ? (
        <>
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span className="hidden sm:inline">{t("share.copied")}</span>
        </>
      ) : (
        <>
          <Link2 className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{state === "failed" ? t("share.copyFailed") : t("share.copyLink")}</span>
        </>
      )}
    </button>
  );
}

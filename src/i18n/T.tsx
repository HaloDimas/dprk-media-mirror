"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageContext";

/** Translate a dictionary key. Renders the English default on the
 *  server, then the chosen language after hydration. */
export function T({ k, values }: { k: string; values?: Record<string, string | number> }) {
  const { t } = useLanguage();
  return <>{t(k, values)}</>;
}

/** Link targets for the [[token]] markers inside rich strings. */
const LINK_TARGETS: Record<string, { href: string; labelKey: string }> = {
  sourcesPage: { href: "/sources", labelKey: "links.sourcesPage" },
  mirroredSources: { href: "/sources", labelKey: "links.mirroredSources" },
  terms: { href: "/terms", labelKey: "links.terms" },
  contactPage: { href: "/contact", labelKey: "links.contactPage" },
  statusPage: { href: "/status", labelKey: "links.statusPage" },
};

/** Render a dictionary string with **bold** markers and [[link]] tokens
 *  (sourcesPage / mirroredSources / terms / contactPage / statusPage). */
export function Rich({ text }: { text: string }) {
  const { t } = useLanguage();
  const parts = text.split(/(\*\*[^*]+\*\*|\[\[[a-zA-Z]+\]\])/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        const m = /^\[\[([a-zA-Z]+)\]\]$/.exec(part);
        if (m) {
          const target = LINK_TARGETS[m[1]];
          if (target) {
            return (
              <Link
                key={i}
                href={target.href}
                className="text-red-600 underline hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
              >
                {t(target.labelKey)}
              </Link>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/** "5m ago" style relative time, translated. `now` is a ms epoch so the
 *  parent (a server component) can pass its own render-time clock. */
export function TimeAgo({ iso, now }: { iso: string | null; now: number }) {
  const { t } = useLanguage();
  if (!iso) return <>—</>;
  const diff = Math.max(0, now - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return <>{t("status.agoSeconds", { n: s })}</>;
  const m = Math.floor(s / 60);
  if (m < 60) return <>{t("status.agoMinutes", { n: m })}</>;
  const h = Math.floor(m / 60);
  if (h < 24) return <>{t("status.agoHours", { h, m: m % 60 })}</>;
  const d = Math.floor(h / 24);
  return <>{t("status.agoDays", { d, h: h % 24 })}</>;
}

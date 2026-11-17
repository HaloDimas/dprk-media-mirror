/** Multi-language UI (English / Bahasa Indonesia / Korean).
 *
 * Client-side dictionaries only — no [locale] routes, no next-intl, no
 * routing changes, so static generation / PPR stays exactly as it is.
 * Fetched content (article bodies, programme titles, station names,
 * publication titles, directory entries) is NEVER translated; only the
 * site's own UI chrome is. The one exception is programme titles, which
 * already ship in both languages — when the UI is Korean the Korean
 * title is shown first (see programTitle in LanguageContext).
 *
 * English is the default and the fallback: a missing key in id/ko falls
 * back to the English string, never to the raw key.
 */

export type Language = "en" | "id" | "ko";

export const LANGUAGES: { code: Language; label: string; nativeName: string }[] = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "id", label: "Bahasa Indonesia", nativeName: "Bahasa Indonesia" },
  { code: "ko", label: "Korean", nativeName: "한국어" },
];

/** localStorage key for the saved UI language (distinct from dprk-theme). */
export const LANGUAGE_STORAGE_KEY = "dprk-language";

/** navigator.language -> UI language: id* -> Indonesian, ko* -> Korean,
 *  anything else -> English. */
export function detectLanguage(navLang: string | undefined | null): Language {
  const l = (navLang || "").toLowerCase();
  if (l.startsWith("id")) return "id";
  if (l.startsWith("ko")) return "ko";
  return "en";
}

/** A long-form section: heading + paragraphs (+ optional bullets).
 *  Paragraphs/bullets may contain **bold** markers and [[link]] tokens
 *  (sources / terms / contact / status), rendered by <Rich>. */
export interface RichSection {
  h: string;
  p: string[];
  bullets?: string[];
}

export interface FaqItem {
  q: string;
  a: string;
}

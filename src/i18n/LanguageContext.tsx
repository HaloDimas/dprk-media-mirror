"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type Dictionary } from "./en";
import { id } from "./id";
import { ko } from "./ko";
import { detectLanguage, LANGUAGE_STORAGE_KEY, type Language } from "./types";
import {
  getEpgLangSetting,
  SETTINGS_CHANGED_EVENT,
} from "@/lib/settings";
import type { Program } from "@/lib/types";

/** All dictionaries, keyed by language — exported so client components
 *  can read array sections (FAQ items, legal-page sections) directly. */
export const DICTS: Record<Language, Dictionary> = { en, id, ko };

/** Resolve a dot-path key ("nav.home") in a dictionary. */
function resolve(dict: Dictionary, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Replace {placeholders} in a template string. */
function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_m, name) => {
    const v = values[name];
    return v === undefined ? `{${name}}` : String(v);
  });
}

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  /** Translate a dictionary key; falls back to English, then to the key. */
  t: (key: string, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => undefined,
  t: (key, values) => interpolate(resolve(en, key) ?? key, values),
});

/** Wraps the app (in the root layout). Server render is English; after
 *  hydration the saved choice (localStorage) or the browser language
 *  (navigator.language) takes over. The choice persists in localStorage. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === "en" || saved === "id" || saved === "ko") {
        setLangState(saved);
        return;
      }
    } catch {
      // Storage unavailable (private mode) — fall through to detection.
    }
    setLangState(detectLanguage(typeof navigator !== "undefined" ? navigator.language : undefined));
  }, []);

  // Keep <html lang> in sync (screen readers, search engines).
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, l);
    } catch {
      // Storage unavailable — the choice just won't persist.
    }
  }, []);

  const t = useCallback(
    (key: string, values?: Record<string, string | number>) => {
      const template = resolve(DICTS[lang], key) ?? resolve(en, key) ?? key;
      return interpolate(template, values);
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

/** Programme title in the UI language: a Korean UI prefers the Korean
 *  title, anything else prefers the English title. Falls back to the
 *  other title when the preferred one is empty; the other title is
 *  returned as `secondary` for the smaller subtitle line. */
export function programTitle(
  p: Program,
  lang: Language
): { primary: string; secondary: string | null } {
  const primary = lang === "ko" ? p.ko || p.en : p.en || p.ko;
  const secondary =
    lang === "ko" ? (p.en && p.en !== primary ? p.en : null) : p.ko && p.ko !== primary ? p.ko : null;
  return { primary, secondary };
}

/** Effective programme-title language: the stored EPG setting
 *  ("dprk-epg-lang"), or the UI language when set to "auto" (Korean UI
 *  -> Korean titles, anything else -> English, matching programTitle's
 *  own preference). Live-updates when the setting changes. */
export function useEpgLang(): Language {
  const { lang } = useLanguage();
  const [setting, setSetting] = useState<"auto" | "en" | "ko">("auto");

  useEffect(() => {
    setSetting(getEpgLangSetting());
    const onChange = () => setSetting(getEpgLangSetting());
    window.addEventListener(SETTINGS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, onChange);
  }, []);

  if (setting === "en" || setting === "ko") return setting;
  return lang === "ko" ? "ko" : "en";
}

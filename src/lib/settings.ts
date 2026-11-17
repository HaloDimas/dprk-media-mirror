/**
 * Shared site settings, all persisted in localStorage (one source of
 * truth — the Settings page and the header controls read and write the
 * SAME keys, never a second copy).
 *
 * - dprk-theme: "dark" | "light" (dark is the default; the no-flash
 *   script in layout.tsx applies it before first paint).
 * - dprk-language: "en" | "id" | "ko" (owned by LanguageProvider).
 * - dprk-nav-appearance: "classic" | "frosted".
 * - dprk-watch-time-enabled: "1" | "0" (default on).
 * - dprk-fullscreen-blur: "1" | "0" (default on).
 * - dprk-epg-lang: "auto" | "en" | "ko" (default "auto" = follow the
 *   UI language).
 *
 * Every setter stores the value, applies any live effect, and dispatches
 * a `dprk-settings-changed` event on window so mounted components
 * (header, player, schedule) can react without a reload. All reads are
 * safe on the server (they fall back to the default when `window` or
 * localStorage is unavailable).
 */

export type Theme = "dark" | "light";
export type NavAppearance = "classic" | "frosted";
export type EpgLangSetting = "auto" | "en" | "ko";

export const THEME_STORAGE_KEY = "dprk-theme";
export const NAV_APPEARANCE_KEY = "dprk-nav-appearance";
export const WATCH_TIME_ENABLED_KEY = "dprk-watch-time-enabled";
export const FULLSCREEN_BLUR_KEY = "dprk-fullscreen-blur";
export const EPG_LANG_KEY = "dprk-epg-lang";

/** Dispatched on window after any setting below changes. */
export const SETTINGS_CHANGED_EVENT = "dprk-settings-changed";
/** Dispatched on window after the theme changes (ThemeToggle listens). */
export const THEME_CHANGED_EVENT = "dprk-theme-changed";

function read(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — the choice just won't persist.
  }
}

function dispatch(event: string): void {
  try {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(event));
  } catch {
    // No window — nothing listening.
  }
}

/** Apply a theme to <html> (the .dark class drives Tailwind's dark:). */
export function applyThemeClass(theme: Theme): void {
  try {
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch {
    // No document — nothing to apply.
  }
}

export function getTheme(): Theme {
  return read(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

/** Store + apply + announce a theme change (single entry point). */
export function setThemePreference(theme: Theme): void {
  write(THEME_STORAGE_KEY, theme);
  applyThemeClass(theme);
  dispatch(THEME_CHANGED_EVENT);
  dispatch(SETTINGS_CHANGED_EVENT);
}

/** Toggle the `nav-frosted` class on <html> from the stored choice. */
export function applyNavAppearance(): void {
  try {
    document.documentElement.classList.toggle(
      "nav-frosted",
      getNavAppearance() === "frosted"
    );
  } catch {
    // No document — nothing to apply.
  }
}

export function getNavAppearance(): NavAppearance {
  return read(NAV_APPEARANCE_KEY) === "frosted" ? "frosted" : "classic";
}

export function setNavAppearance(value: NavAppearance): void {
  write(NAV_APPEARANCE_KEY, value);
  applyNavAppearance();
  dispatch(SETTINGS_CHANGED_EVENT);
}

export function getWatchTimeEnabled(): boolean {
  return read(WATCH_TIME_ENABLED_KEY) !== "0";
}

export function setWatchTimeEnabled(enabled: boolean): void {
  write(WATCH_TIME_ENABLED_KEY, enabled ? "1" : "0");
  dispatch(SETTINGS_CHANGED_EVENT);
}

export function getFullscreenBlur(): boolean {
  return read(FULLSCREEN_BLUR_KEY) !== "0";
}

export function setFullscreenBlur(enabled: boolean): void {
  write(FULLSCREEN_BLUR_KEY, enabled ? "1" : "0");
  dispatch(SETTINGS_CHANGED_EVENT);
}

export function getEpgLangSetting(): EpgLangSetting {
  const v = read(EPG_LANG_KEY);
  return v === "en" || v === "ko" ? v : "auto";
}

export function setEpgLangSetting(value: EpgLangSetting): void {
  write(EPG_LANG_KEY, value);
  dispatch(SETTINGS_CHANGED_EVENT);
}

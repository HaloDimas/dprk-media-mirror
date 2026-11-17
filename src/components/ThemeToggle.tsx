"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  applyThemeClass as applyTheme,
  getTheme,
  setThemePreference,
  THEME_CHANGED_EVENT,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/settings";

// Re-exported so existing imports keep working; @/lib/settings is the
// single source of truth for the theme key and helpers.
export { THEME_STORAGE_KEY, type Theme, applyTheme };

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(getTheme());
    // The Settings page writes the same key — re-read when it changes so
    // the header icon always matches the saved theme.
    const onThemeChange = () => setTheme(getTheme());
    window.addEventListener(THEME_CHANGED_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, onThemeChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemePreference(next);
  };

  const shared =
    "inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

  // Before hydration, render the dark-state button (Sun = switch to light):
  // the no-flash script in the layout has already applied the saved theme
  // class, so there is no flash — only the icon may swap once mounted.
  if (!mounted) {
    return (
      <button type="button" aria-label="Switch to light mode" className={shared}>
        <Sun className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={shared}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

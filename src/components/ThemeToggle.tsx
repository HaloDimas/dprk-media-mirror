"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/** localStorage key for the saved theme. Dark is the default when
    nothing is stored (see the no-flash script in layout.tsx). */
export const THEME_STORAGE_KEY = "dprk-theme";

export type Theme = "dark" | "light";

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      setTheme(saved === "light" ? "light" : "dark");
    } catch {
      // Storage unavailable (private mode) — stay on the default dark theme.
    }
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable — the choice just won't persist.
    }
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

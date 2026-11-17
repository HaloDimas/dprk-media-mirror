"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Check, Ellipsis, Menu, Moon, Settings, Sun, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANGUAGES } from "@/i18n/types";
import {
  getTheme,
  setThemePreference,
  THEME_CHANGED_EVENT,
  type Theme,
} from "@/lib/settings";
import { useSaved } from "@/lib/saved";

const LINKS = [
  { href: "/", key: "nav.home" },
  { href: "/live", key: "nav.liveTv" },
  { href: "/schedule", key: "nav.schedule" },
  { href: "/news", key: "nav.news" },
  { href: "/radio", key: "nav.radio" },
  { href: "/recordings", key: "nav.recordings" },
  { href: "/publications", key: "nav.publications" },
  { href: "/directory", key: "nav.directory" },
  { href: "/sources", key: "nav.sources" },
  { href: "/status", key: "nav.status" },
];

export function NavSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const { t } = useLanguage();
  const [q, setQ] = useState(sp.get("q") || "");

  useEffect(() => setQ(sp.get("q") || ""), [sp]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
      }}
      className="flex w-full items-center sm:w-48"
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("nav.searchPlaceholder")}
        aria-label={t("nav.searchAria")}
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
      />
    </form>
  );
}

/** Single "more" menu (desktop only): one 38px Ellipsis button that
 *  replaces the four separate header controls — Settings gear, Saved
 *  bookmark, theme toggle and language selector (commits 19a78ff /
 *  2986874) — which had stretched the controls row too long. The search
 *  box stays visible next to it. The panel closes on Escape, on outside
 *  click, on navigation, and after any item is chosen (theme included —
 *  the switch is visible across the whole page the moment it is picked).
 *  "Outside" is caught by a transparent fixed overlay under the panel:
 *  a plain document mousedown listener is NOT enough on this site,
 *  because clicks on the homepage <video> never reach the document at
 *  all — Chromium's native media-controls shadow DOM swallows them
 *  (verified: no document or window listener of any phase fires on a
 *  video click). The overlay is portalled to document.body because a
 *  `fixed` element inside the header is trapped there: the frosted
 *  header's backdrop-filter makes it a containing block, so an in-tree
 *  overlay only covered the 66px header strip (verified by measurement).
 *  It sits at z-30 — below the frosted header's z-40 (so the panel and
 *  the menu button stay clickable) but above the video's z-10 and
 *  normal page content. The document listener stays as a safety net
 *  for anything rendered above the overlay.
 *  Theme, language and saved state are read after mount, as in the
 *  components this replaces, so there is no hydration mismatch — and
 *  the panel only renders after a click, i.e. after hydration anyway.
 *  Mobile gets no menu button (hidden below xl); the hamburger menu
 *  below is unchanged. */
export function HeaderMenu() {
  const pathname = usePathname();
  const { t, lang, setLang } = useLanguage();
  const { items } = useSaved();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(getTheme());
    const onThemeChange = () => setTheme(getTheme());
    window.addEventListener(THEME_CHANGED_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, onThemeChange);
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close on navigation (the links also close on click; this is the
  // safety net for any other navigation while the panel is open).
  useEffect(() => setOpen(false), [pathname]);

  const hasSaved = items.length > 0;

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemePreference(next);
    setOpen(false);
  };

  const itemClass = (isActive: boolean) =>
    `flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
      isActive
        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
        : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
    }`;

  return (
    <div className="relative hidden xl:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("nav.menu")}
        title={t("nav.menu")}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative z-50 inline-flex shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <Ellipsis className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <>
          {/* Portalled: a fixed overlay inside the frosted header would be
              trapped by its backdrop-filter containing block (see comment
              above). Rendered only while open, i.e. after a client click,
              so document.body always exists here. */}
          {createPortal(
            <div
              className="fixed inset-0 z-30"
              onMouseDown={() => setOpen(false)}
              aria-hidden="true"
            />,
            document.body
          )}
          <div
            role="menu"
            aria-label={t("nav.menu")}
            className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
          <Link
            href="/saved"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass(pathname === "/saved")}
          >
            <Bookmark
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
              fill={hasSaved ? "currentColor" : "none"}
            />
            {t("nav.saved")}
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass(pathname === "/settings")}
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("nav.settings")}
          </Link>
          <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" role="separator" />
          <button type="button" role="menuitem" onClick={toggleTheme} className={itemClass(false)}>
            {theme === "dark" ? (
              <Sun className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className="flex-1">{t("settings.themeLabel")}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {theme === "dark" ? t("settings.themeDark") : t("settings.themeLight")}
            </span>
          </button>
          <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" role="separator" />
          <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("lang.buttonAria")}
          </div>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={lang === l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={itemClass(false)}
            >
              <span className="flex-1">{l.nativeName}</span>
              {lang === l.code && (
                <Check className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label={t("nav.toggleMenuAria")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 xl:hidden"
      >
        {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
        {t("nav.menu")}
      </button>
      <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] xl:flex [&::-webkit-scrollbar]:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-md px-1.5 py-1.5 text-[13px] font-medium transition-colors ${
              active(l.href)
                ? "bg-red-700 text-white"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {t(l.key)}
          </Link>
        ))}
      </nav>
      {open && (
        <nav className="flex w-full flex-col gap-1 border-t border-zinc-200 dark:border-zinc-800 pt-2 xl:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active(l.href)
                  ? "bg-red-700 text-white"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {t(l.key)}
            </Link>
          ))}
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active("/settings")
                ? "bg-red-700 text-white"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {t("nav.settings")}
          </Link>
          <Link
            href="/saved"
            onClick={() => setOpen(false)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active("/saved")
                ? "bg-red-700 text-white"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {t("nav.saved")}
          </Link>
        </nav>
      )}
    </>
  );
}

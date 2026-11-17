"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Settings, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

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
      className="flex w-full items-center sm:w-36"
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
      {/* Settings gear (desktop only): icon-only, ~38px — an 11th text
          link would eat the nav strip's headroom and re-clip Status
          (see commit 969fb51). Same button styling as ThemeToggle so the
          controls read as one group. The 32px freed by shrinking the
          search box (w-44 → w-36) funds most of it. Mobile gets a text
          entry in the hamburger menu below instead. */}
      <Link
        href="/settings"
        aria-label={t("nav.settings")}
        title={t("nav.settings")}
        className={`hidden shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 xl:inline-flex ${
          active("/settings") ? "bg-zinc-100 dark:bg-zinc-800" : ""
        }`}
      >
        <Settings className="h-4 w-4" aria-hidden="true" />
      </Link>
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
        </nav>
      )}
    </>
  );
}

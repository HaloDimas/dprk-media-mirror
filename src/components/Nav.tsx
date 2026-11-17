"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live TV" },
  { href: "/schedule", label: "Schedule" },
  { href: "/news", label: "News" },
  { href: "/radio", label: "Radio" },
  { href: "/recordings", label: "Recordings" },
  { href: "/publications", label: "Publications" },
  { href: "/directory", label: "Directory" },
  { href: "/sources", label: "Sources" },
  { href: "/status", label: "Status" },
];

export function NavSearch() {
  const router = useRouter();
  const sp = useSearchParams();
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
        placeholder="Search the mirror…"
        aria-label="Search the mirror"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:outline-none"
      />
    </form>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label="Toggle menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 xl:hidden"
      >
        {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
        Menu
      </button>
      <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] xl:flex [&::-webkit-scrollbar]:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors ${
              active(l.href)
                ? "bg-red-700 text-white"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {open && (
        <nav className="flex w-full flex-col gap-1 border-t border-zinc-800 pt-2 xl:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active(l.href)
                  ? "bg-red-700 text-white"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

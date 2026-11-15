"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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

function NavSearch() {
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
      className="flex w-full min-w-44 flex-1 items-center sm:w-auto sm:max-w-64"
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
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  return (
    <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            active(l.href)
              ? "bg-red-700 text-white"
              : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          {l.label}
        </Link>
      ))}
      <div className="ml-auto flex w-full sm:w-auto sm:pl-2">
        <NavSearch />
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live TV" },
  { href: "/schedule", label: "Schedule" },
  { href: "/news", label: "News" },
  { href: "/radio", label: "Radio" },
  { href: "/recordings", label: "Recordings" },
  { href: "/publications", label: "Publications" },
  { href: "/directory", label: "Directory" },
];

export default function Nav() {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  return (
    <nav className="flex flex-wrap gap-1">
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
    </nav>
  );
}

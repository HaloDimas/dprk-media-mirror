import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import Nav, { NavSearch } from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DPRK Media Mirror — KCTV, Radio, News & Publications",
  description:
    "A single mirror of North Korean state media: live KCTV, Athletic TV and Ryongnamsan TV, radio, the full programme guide, KCNA news, recordings and publications — all on one site.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 bg-zinc-950/95">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
            <Link href="/" className="flex shrink-0 items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-white">
                DPRK <span className="text-red-500">Media Mirror</span>
              </span>
              <span className="hidden text-xs text-zinc-500 sm:inline">조선 매체</span>
            </Link>
            <Suspense
              fallback={
                <nav className="flex flex-wrap gap-1" aria-hidden="true">
                  {["Home", "Live TV", "Schedule", "News", "Radio", "Recordings", "Publications", "Directory"].map(
                    (label) => (
                      <span key={label} className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-300">
                        {label}
                      </span>
                    )
                  )}
                </nav>
              }
            >
              <Nav />
              <div className="flex w-full shrink-0 sm:w-auto">
                <NavSearch />
              </div>
            </Suspense>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

        <footer className="border-t border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-zinc-500">
            <p>
              DPRK Media Mirror — live TV, radio, programme guides, news, recordings and publications
              mirrored onto this site from Koryo Front and KCNA Watch. All reading and watching happens
              here; nothing on this site sends you to another site to read or watch.
            </p>
            <p className="mt-2">
              Sources mirrored: Koryo Front (live TV, radio, programme guide, recordings, publications,
              Korea News Service articles) and KCNA Watch (latest headlines, excerpt only — full text
              requires a free KCNA Watch account). Programme times are Pyongyang Time (UTC+9).
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

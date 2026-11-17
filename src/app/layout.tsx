import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import Nav, { HeaderMenu, NavSearch } from "@/components/Nav";
import SettingsApplier from "@/components/SettingsApplier";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { T } from "@/i18n/T";
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
  metadataBase: new URL("https://dprkmedia.vercel.app"),
  title: "DPRK Media Mirror — KCTV, Radio, News & Publications",
  description:
    "A single mirror of North Korean state media: live KCTV, Athletic TV and Ryongnamsan TV, radio, the full programme guide, KCNA news, recordings and publications — all on one site.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "DPRK Media Mirror",
    title: "DPRK Media Mirror — KCTV, Radio, News & Publications",
    description:
      "Live North Korean TV and radio, programme guides, KCNA news, recordings and publications — mirrored on one site.",
    url: "https://dprkmedia.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "DPRK Media Mirror — KCTV, Radio, News & Publications",
    description:
      "Live North Korean TV and radio, programme guides, KCNA news, recordings and publications — mirrored on one site.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* No-flash theme script: runs before first paint. Dark is the
            default; only an explicit saved "light" choice skips the class.
            suppressHydrationWarning on <html> covers the class React
            didn't render on the server. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("dprk-theme");if(t!=="light"){document.documentElement.classList.add("dark")}}catch(e){document.documentElement.classList.add("dark")}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem("dprk-language");if(l==="id"||l==="ko"||l==="en"){document.documentElement.lang=l}else{var n=(navigator.language||"").toLowerCase();document.documentElement.lang=n.indexOf("id")===0?"id":n.indexOf("ko")===0?"ko":"en"}}catch(e){}})();`,
          }}
        />
        {/* No-flash nav-appearance script: Frosted is the default — only
            an explicit saved "classic" choice skips the class, so the
            header never flashes solid on first visit. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("dprk-nav-appearance")!=="classic"){document.documentElement.classList.add("nav-frosted")}}catch(e){document.documentElement.classList.add("nav-frosted")}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <LanguageProvider>
        <SettingsApplier />
        <header className="border-b border-zinc-200 bg-white/95 dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
            <Link href="/" className="flex shrink-0 items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                DPRK <span className="text-red-500">Media Mirror</span>
              </span>
              <span className="hidden text-xs text-zinc-500 xl:inline">조선 매체</span>
            </Link>
            <Suspense
              fallback={
                <nav className="hidden flex-wrap gap-1 xl:flex" aria-hidden="true">
                  {["Home", "Live TV", "Schedule", "News", "Radio", "Recordings", "Publications", "Directory", "Sources", "Status"].map(
                    (label) => (
                      <span key={label} className="rounded-md px-1.5 py-1.5 text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                        {label}
                      </span>
                    )
                  )}
                </nav>
              }
            >
              <Nav />
              <div className="flex w-full shrink-0 items-center gap-1.5 sm:w-auto">
                <NavSearch />
                <HeaderMenu />
              </div>
            </Suspense>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

        <footer className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-zinc-500">
            <nav className="mb-4 flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
              <Link href="/contact" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                <T k="footer.contact" />
              </Link>
              <Link href="/faq" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                <T k="footer.faq" />
              </Link>
              <Link href="/privacy" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                <T k="footer.privacy" />
              </Link>
              <Link href="/terms" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                <T k="footer.terms" />
              </Link>
              <Link href="/settings" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                <T k="footer.settings" />
              </Link>
              <Link href="/eula" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                <T k="footer.eula" />
              </Link>
              <Link href="/attributions" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                <T k="footer.attributions" />
              </Link>
              <Link href="/saved" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                <T k="footer.saved" />
              </Link>
            </nav>
            <p>
              <T k="footer.about" />
            </p>
            <p className="mt-2">
              <T k="footer.legal" />
            </p>
            <p className="mt-2">© 2026 DPRK Media Mirror</p>
          </div>
        </footer>
        <Analytics />
        <SpeedInsights />
        </LanguageProvider>
      </body>
    </html>
  );
}

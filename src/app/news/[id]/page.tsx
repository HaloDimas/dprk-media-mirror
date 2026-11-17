import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { getAllNews, getArticle } from "@/lib/sources";

// Articles NOT prerendered at build time — they render on demand instead
// (dynamicParams below), because rendering one needs a live fetch from a
// flaky upstream that can exceed the 60s static-generation limit and fail
// the whole build:
// - "kcna-" (KCNA Watch homepage): the body fetch is a 25s no-store request
//   that Cloudflare often challenges.
// - "kcnad-", "rodong-", "pytimes-", "vok-", "korarch-": full-text articles
//   whose bodies are fetched from slow .kp servers (one VOK article URL
//   now 404s at the source; Pyongyang Times / KCNA pages have timed out
//   past 60s during prerender).
// Safe to prerender: KNS articles (fast API) and excerpt-only items
// (Minju, Naenara, Youth, Ryugyong), which need no body fetch at all.
const SLOW_FULL_PREFIXES = ["kcnad-", "rodong-", "pytimes-", "vok-", "korarch-"];

// Cap the prerender set so the build stays fast even as the feed grows.
const MAX_PRERENDERED = 80;

// Cache Components requires generateStaticParams to return at least one
// param. If the feed is completely unreachable at build time, return a
// placeholder that the page turns into a 404 immediately (no fetch).
const PLACEHOLDER_ID = "__placeholder__";

// Unlisted articles render on demand at request time (and are cached after).
// (No `dynamicParams` export: it is incompatible with cacheComponents —
// on-demand rendering of unlisted params is the default under PPR.)

// Prerender only the articles that render fast and reliably. New articles
// that appear later are rendered on demand (partial prefetching) and cached.
export async function generateStaticParams() {
  try {
    const items = await getAllNews();
    const fast = items
      .filter((it) => {
        if (it.id.startsWith("kcna-")) return false;
        if (it.kind === "full" && SLOW_FULL_PREFIXES.some((p) => it.id.startsWith(p))) return false;
        return true;
      })
      .slice(0, MAX_PRERENDERED);
    if (fast.length === 0) return [{ id: PLACEHOLDER_ID }];
    return fast.map((it) => ({ id: it.id }));
  } catch {
    return [{ id: PLACEHOLDER_ID }];
  }
}

async function ArticleContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Build-time placeholder (feed unreachable): 404 without any fetch.
  if (id === PLACEHOLDER_ID) notFound();
  const [article, allNews] = await Promise.all([getArticle(id), getAllNews()]);
  if (!article) notFound();

  // Prev / Next in the full news list (newest first), plus related articles.
  const idx = allNews.findIndex((n) => n.id === id);
  const newer = idx > 0 ? allNews[idx - 1] : null;
  const older = idx >= 0 && idx < allNews.length - 1 ? allNews[idx + 1] : null;
  const related = allNews
    .filter((n) => n.id !== id && n.source === article.source)
    .slice(0, 4);

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-300">{article.source}</span>
        <span className="text-zinc-500">{article.date}</span>
        {article.kind === "excerpt" && (
          <span className="rounded bg-amber-100 dark:bg-amber-900/70 px-2 py-0.5 text-amber-800 dark:text-amber-200">Excerpt only</span>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-bold leading-snug text-zinc-900 dark:text-white">{article.title}</h1>

      {article.note && (
        <p className="mt-4 rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-100 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {article.note}
        </p>
      )}

      {article.kind === "excerpt" && article.originalUrl && (
        <a
          href={article.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-100 dark:bg-red-950/40 px-4 py-2.5 text-sm font-medium text-red-800 dark:text-red-200 transition-colors hover:bg-red-900/50"
        >
          Read the full article on the original site
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </a>
      )}

      {article.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.image} alt="" className="mt-4 w-full rounded-xl object-cover" />
      )}

      <div className="mt-5 space-y-4">
        {article.blocks.map((b, i) =>
          b.type === "text" ? (
            <p key={i} className="leading-relaxed text-zinc-800 dark:text-zinc-200">
              {b.text}
            </p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={b.src} alt={b.alt} className="w-full max-w-xl rounded-xl" loading="lazy" />
          )
        )}
        {article.blocks.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            The article text could not be loaded. Please try again later.
          </p>
        )}
      </div>

      <p className="mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-4 text-xs text-zinc-500">
        {article.kind === "full"
          ? `Full article mirrored on this site from ${article.source}.`
          : article.source === "KCNA Watch"
            ? "Excerpt mirrored on this site from KCNA Watch. The full text needs a live KCNA Watch session — the mirror's session is currently expired or not configured."
            : `Excerpt mirrored on this site from ${article.source}. The full text cannot be fetched from this source.`}
      </p>

      {/* Prev / Next */}
      <nav className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="More articles">
        {older ? (
          <Link
            href={`/news/${older.id}`}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4 transition-colors hover:border-red-800"
          >
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-zinc-500">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Older
            </span>
            <span className="mt-1 block text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{older.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link
            href={`/news/${newer.id}`}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4 text-right transition-colors hover:border-red-800"
          >
            <span className="inline-flex items-center justify-end gap-1 text-xs uppercase tracking-wide text-zinc-500">
              Newer <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="mt-1 block text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{newer.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-baseline gap-2 text-base font-bold text-zinc-900 dark:text-white">
            <span className="inline-block h-4 w-1 rounded bg-red-600" />
            Related from {article.source}
          </h2>
          <ul className="space-y-2">
            {related.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 transition-colors hover:border-red-800"
              >
                <Link href={`/news/${r.id}`} className="flex items-center gap-3 p-3">
                  <div className="min-w-0">
                    <span className="text-xs text-zinc-500">{r.date}</span>
                    <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{r.title}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/news" className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All news
      </Link>
      <Suspense
        fallback={<p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Loading article…</p>}
      >
        <ArticleContent params={params} />
      </Suspense>
    </article>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAllNews, getArticle } from "@/lib/sources";

// Prerender the article pages we know about at build time. New articles
// that appear later are rendered on demand (partial prefetching) and cached.
export async function generateStaticParams() {
  try {
    const items = await getAllNews();
    return items.map((it) => ({ id: it.id }));
  } catch {
    return [];
  }
}

async function ArticleContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{article.source}</span>
        <span className="text-zinc-500">{article.date}</span>
        {article.kind === "excerpt" && (
          <span className="rounded bg-amber-900/70 px-2 py-0.5 text-amber-200">Excerpt only</span>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-bold leading-snug text-white">{article.title}</h1>

      {article.note && (
        <p className="mt-4 rounded-lg border border-amber-800/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          {article.note}
        </p>
      )}

      {article.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.image} alt="" className="mt-4 w-full rounded-xl object-cover" />
      )}

      <div className="mt-5 space-y-4">
        {article.blocks.map((b, i) =>
          b.type === "text" ? (
            <p key={i} className="leading-relaxed text-zinc-200">
              {b.text}
            </p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={b.src} alt={b.alt} className="w-full max-w-xl rounded-xl" loading="lazy" />
          )
        )}
        {article.blocks.length === 0 && (
          <p className="text-sm text-zinc-400">
            The article text could not be loaded. Please try again later.
          </p>
        )}
      </div>

      <p className="mt-8 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
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
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-red-800"
          >
            <span className="text-xs uppercase tracking-wide text-zinc-500">← Older</span>
            <span className="mt-1 block text-sm font-medium leading-snug text-zinc-100">{older.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link
            href={`/news/${newer.id}`}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-right transition-colors hover:border-red-800"
          >
            <span className="text-xs uppercase tracking-wide text-zinc-500">Newer →</span>
            <span className="mt-1 block text-sm font-medium leading-snug text-zinc-100">{newer.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-baseline gap-2 text-base font-bold text-white">
            <span className="inline-block h-4 w-1 rounded bg-red-600" />
            Related from {article.source}
          </h2>
          <ul className="space-y-2">
            {related.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 transition-colors hover:border-red-800"
              >
                <Link href={`/news/${r.id}`} className="flex items-center gap-3 p-3">
                  <div className="min-w-0">
                    <span className="text-xs text-zinc-500">{r.date}</span>
                    <span className="block truncate text-sm font-medium text-zinc-100">{r.title}</span>
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
      <Link href="/news" className="text-sm text-red-400 hover:underline">
        ← All news
      </Link>
      <Suspense
        fallback={<p className="mt-6 text-sm text-zinc-400">Loading article…</p>}
      >
        <ArticleContent params={params} />
      </Suspense>
    </article>
  );
}

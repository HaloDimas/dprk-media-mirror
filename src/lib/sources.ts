// Server-side data access. Every upstream call happens HERE (on the server),
// never in the browser — the sources send no CORS headers.
import * as cheerio from "cheerio";
import type {
  Article,
  ArticleBlock,
  ChannelId,
  EpgData,
  KcnwArticle,
  NewsItem,
  PeriodicalItem,
  Program,
  PublicationItem,
  RecordingItem,
} from "./types";
import { SNAPSHOT_DATE, SNAPSHOT_KCTV, SNAPSHOT_SPORTS } from "./snapshot";

export const KORYO_FRONT = "https://koryofront.org";
export const KNS = "https://koreanewsservice.com";
export const KCNA_WATCH = "https://kcnawatch.org";
const UA = "DPRK-Media-Mirror/1.0 (+https://koryofront.org)";

async function fetchJson<T>(url: string, revalidate = 3600): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url: string, revalidate = 3600): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      next: { revalidate },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- EPG
interface RawProgram {
  start: string;
  end: string;
  title: { en: string; ko: string };
  category: string;
}
interface RawEpg {
  channel: string;
  date: string;
  programs: RawProgram[];
}

const EPG_ENDPOINT: Record<Exclude<ChannelId, "mansudae">, string> = {
  kctv: "/api/kctv/epg",
  sports: "/api/epg/sports",
  ryongnamsan: "/api/epg/ryongnamsan",
};

export async function getEpg(channel: ChannelId, date: string): Promise<EpgData> {
  const fallback = (): EpgData => {
    if (channel === "kctv") return { channel: "Korean Central Television", date, programs: SNAPSHOT_KCTV, source: "snapshot" };
    if (channel === "sports") return { channel: "Athletic Television", date, programs: SNAPSHOT_SPORTS, source: "snapshot" };
    return { channel: "Ryongnamsan Television", date, programs: [], source: "snapshot" };
  };
  if (channel === "mansudae") {
    return { channel: "Mansudae Television", date, programs: [], source: "snapshot" };
  }
  try {
    const raw = await fetchJson<RawEpg>(`${KORYO_FRONT}${EPG_ENDPOINT[channel]}?date=${date}`, 1800);
    const programs: Program[] = (raw.programs || []).map((p) => ({
      start: p.start,
      end: p.end,
      en: p.title?.en ?? "",
      ko: p.title?.ko ?? "",
      category: p.category ?? "General",
    }));
    return { channel: raw.channel, date: raw.date || date, programs, source: "live" };
  } catch {
    // Only fall back to the baked snapshot for the date it was captured on.
    if (date === SNAPSHOT_DATE) return fallback();
    return { channel, date, programs: [], source: "snapshot" };
  }
}

// ---------------------------------------------------------------- News
interface RawKnsItem {
  id: string;
  title: string;
  link: string;
  image: string;
  pubDate: string;
  source: string;
  portrait: boolean;
}

function toEpoch(d: string): number {
  const t = Date.parse(d);
  return Number.isNaN(t) ? 0 : t;
}

export async function getKnsNews(): Promise<NewsItem[]> {
  try {
    const raw = await fetchJson<RawKnsItem[]>(`${KORYO_FRONT}/api/news`, 1800);
    return raw.map((r) => ({
      id: r.id,
      title: r.title,
      excerpt: "",
      date: r.pubDate,
      dateValue: toEpoch(r.pubDate),
      image: r.image ? `/api/kns-image${r.image.replace(/^\/api\/kns-image/, "")}` : null,
      source: "KNS",
      kind: "full",
      knsLink: r.link,
    }));
  } catch {
    return [];
  }
}

export async function getKcnaWatchNews(): Promise<NewsItem[]> {
  try {
    const html = await fetchText(KCNA_WATCH + "/", 1800);
    const $ = cheerio.load(html);
    const items: NewsItem[] = [];
    $("#latest_article_wrapper article.clearfix").each((i, el) => {
      const $el = $(el);
      const title = $el.find(".article-desc h4 a").text().trim();
      const excerpt = $el.find(".article-desc p").first().text().trim();
      const dateRaw = $el.find(".article-desc p.articled-date span").text().replace(/\s+/g, " ").trim();
      const href = $el.find(".article-desc h4 a").attr("href") || $el.find(".article-thumb a").attr("href") || "";
      const img =
        $el.find(".article-thumb img").attr("data-lazy-src") ||
        $el.find(".article-thumb img").attr("src") ||
        null;
      if (!title) return;
      items.push({
        id: `kcna-${i}`,
        title,
        excerpt,
        date: dateRaw,
        dateValue: toEpoch(dateRaw),
        image: img && img.startsWith("http") ? `/api/img?u=${encodeURIComponent(img)}` : null,
        source: "KCNA Watch",
        kind: "excerpt",
        articleUrl: href.startsWith("http") ? href : href ? `${KCNA_WATCH}${href}` : undefined,
      });
    });
    return items;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- KCNA Watch
// Full article text + the 1.37M-article archive, via an authenticated session.
// The session cookie is read ONLY from process.env.KCNW_COOKIE (a full
// "name=value" cookie string, set in the Vercel dashboard). It is NEVER
// hardcoded, logged, or written to the repo.

const KCNW_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export type KcnwBodyResult =
  | { ok: true; blocks: ArticleBlock[]; title: string; date: string }
  | {
      ok: false;
      error: "not_configured" | "session_expired" | "unavailable" | "not_found";
      debug?: {
        status?: number;
        finalUrl?: string;
        htmlLen?: number;
        markers?: Record<string, boolean>;
      };
    };

/**
 * Fetch a KCNA Watch article page with the session cookie and extract the
 * full body from `.article-view .article-content` (paragraphs + images).
 * Returns not_configured when KCNW_COOKIE is unset, session_expired when the
 * site redirects to the free-member signup popup.
 */
export async function getKcnaWatchArticleBody(url: string): Promise<KcnwBodyResult> {
  const cookie = process.env.KCNW_COOKIE;
  if (!cookie) return { ok: false, error: "not_configured" };
  let res: Response;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      // cache: "no-store" — a fresh fetch every time. (Previously next.revalidate
      // cached the response for 24h, so one blocked/challenged fetch could poison
      // every later request for the same article.)
      res = await fetch(url, {
        headers: { Cookie: cookie, "User-Agent": KCNW_UA, Accept: "text/html,application/xhtml+xml" },
        cache: "no-store",
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { ok: false, error: "unavailable" };
  }
  // Expired session: the site 302s to ?popup=free-member-form.
  if (res.url.includes("free-member-form")) return { ok: false, error: "session_expired" };
  if (!res.ok)
    return {
      ok: false,
      error: res.status === 404 ? "not_found" : "unavailable",
      debug: { status: res.status, finalUrl: res.url },
    };
  const html = await res.text();
  const markers: Record<string, boolean> = {};
  for (const m of ["article-view", "free-member-form", "cloudflare", "challenge", "turnstile", "Attention", "Just a moment", "cf-challenge"]) {
    markers[m] = html.toLowerCase().includes(m.toLowerCase());
  }
  const debug = { status: res.status, finalUrl: res.url, htmlLen: html.length, markers };
  if (html.includes("free-member-form") && !html.includes("article-view")) {
    return { ok: false, error: "session_expired", debug };
  }
  const $ = cheerio.load(html);
  const $content = $(".article-view .article-content").first();
  if (!$content.length) return { ok: false, error: "not_found", debug };
  const blocks: ArticleBlock[] = [];
  $content.find("p").each((_, p) => {
    const $p = $(p);
    const $img = $p.find("img").first();
    if ($img.length) {
      const src = $img.attr("src") || $img.attr("data-lazy-src") || "";
      if (src.startsWith("http")) {
        blocks.push({
          type: "image",
          src: `/api/img?u=${encodeURIComponent(src)}`,
          alt: $img.attr("alt") || "",
        });
      }
    }
    const text = $p
      .clone()
      .children("img")
      .remove()
      .end()
      .text()
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) blocks.push({ type: "text", text });
  });
  // Title + date from the article header, if present.
  const title =
    $(".article-view h1").first().text().trim() ||
    $(".article-view .article-title").first().text().trim() ||
    $("title").first().text().replace(/\s*\|.*$/, "").trim();
  const date =
    $(".article-view .article-date").first().text().replace(/\s+/g, " ").trim() ||
    $(".article-view time").first().attr("datetime") ||
    "";
  if (!blocks.length) return { ok: false, error: "not_found", debug };
  return { ok: true, blocks, title, date };
}

/** Encode an archive article's metadata into a stable /news/[id] id. */
export function encodeKcnwId(a: { url: string; title: string; date: string; excerpt: string; image: string | null }): string {
  const json = JSON.stringify({ u: a.url, t: a.title, d: a.date, e: a.excerpt.slice(0, 300), i: a.image });
  return "kcnw-" + Buffer.from(json, "utf-8").toString("base64url");
}

/** Decode a kcnw- id back to the article's metadata. Returns null if invalid. */
export function decodeKcnwId(id: string): { url: string; title: string; date: string; excerpt: string; image: string | null } | null {
  try {
    const json = Buffer.from(id.slice(5), "base64url").toString("utf-8");
    const o = JSON.parse(json) as { u?: string; t?: string; d?: string; e?: string; i?: string | null };
    if (!o.u || !o.u.startsWith("https://kcnawatch.org/")) return null;
    return { url: o.u, title: o.t ?? "", date: o.d ?? "", excerpt: o.e ?? "", image: o.i ?? null };
  } catch {
    return null;
  }
}

/** Parse KCNA Watch `<article>` blocks (search/browse HTML) into structured items. */
export function parseKcnwArticles(html: string): KcnwArticle[] {
  const $ = cheerio.load(html);
  const items: KcnwArticle[] = [];
  $("article").each((_, el) => {
    const $el = $(el);
    const $link = $el.find(".article-desc h4 a").first().length
      ? $el.find(".article-desc h4 a").first()
      : $el.find("h4 a, h3 a, a").first();
    const href = $link.attr("href") || "";
    const title = $link.text().replace(/\s+/g, " ").trim();
    if (!title || !href.startsWith("http")) return;
    const excerpt = $el.find(".article-desc p").first().text().replace(/\s+/g, " ").trim();
    const dateRaw = $el.find(".article-desc p.articled-date span").text().replace(/\s+/g, " ").trim();
    const img =
      $el.find(".article-thumb img").attr("data-lazy-src") ||
      $el.find(".article-thumb img").attr("src") ||
      null;
    const image = img && img.startsWith("http") ? `/api/img?u=${encodeURIComponent(img)}` : null;
    items.push({
      id: encodeKcnwId({ url: href, title, date: dateRaw, excerpt, image }),
      title,
      url: href,
      excerpt,
      date: dateRaw,
      dateValue: toEpoch(dateRaw),
      image,
    });
  });
  return items;
}

export interface KcnwSearchResult {
  count: number;
  articles: KcnwArticle[];
  hasMore: boolean;
  error?: "not_configured" | "search_unavailable";
}

/**
 * Search the full 1.37M-article KCNA Watch archive (authenticated).
 * `from` is the result offset (0, 20, 40, ...); 20 results per page.
 * Note: the upstream start/end date params are non-functional — no date filter.
 */
export async function getKcnwSearch(
  q: string,
  source: string,
  from: number,
  sort: string
): Promise<KcnwSearchResult> {
  const cookie = process.env.KCNW_COOKIE;
  if (!cookie) return { count: 0, articles: [], hasMore: false, error: "not_configured" };
  const params = new URLSearchParams({
    action: "get_kcna_search_result",
    die: "true",
    s: q,
    from: String(from),
    sort,
    start: "",
    end: "",
  });
  if (source) params.append("source[]", source);
  let res: Response;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      res = await fetch(`${KCNA_WATCH}/wp-admin/admin-ajax.php?${params.toString()}`, {
        headers: { Cookie: cookie, "User-Agent": KCNW_UA, Accept: "application/json" },
        next: { revalidate: 3600 },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { count: 0, articles: [], hasMore: false, error: "search_unavailable" };
  }
  if (res.status === 401) return { count: 0, articles: [], hasMore: false, error: "search_unavailable" };
  if (!res.ok) return { count: 0, articles: [], hasMore: false, error: "search_unavailable" };
  const data = (await res.json().catch(() => null)) as { count?: number; result?: string } | null;
  if (!data || typeof data.count !== "number" || typeof data.result !== "string") {
    return { count: 0, articles: [], hasMore: false, error: "search_unavailable" };
  }
  const articles = parseKcnwArticles(data.result);
  return { count: data.count, articles, hasMore: from + articles.length < data.count };
}

/**
 * Browse the latest KCNA Watch articles (anonymous, back to ~2015, ~430k).
 * `from` is the offset; 10 results per page (`to` is capped at 10 upstream).
 * Ordering gets non-monotonic at deep offsets (duplicates/gaps possible).
 */
export async function getKcnwLatest(
  from: number,
  sort: string,
  lang: string
): Promise<{ articles: KcnwArticle[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    action: "get_kcna_latest_articles",
    die: "true",
    from: String(from),
    to: "10",
    sort,
    lang,
  });
  let res: Response;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      res = await fetch(`${KCNA_WATCH}/wp-admin/admin-ajax.php?${params.toString()}`, {
        headers: { "User-Agent": KCNW_UA, Accept: "text/html" },
        next: { revalidate: 86400 },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { articles: [], hasMore: false };
  }
  if (!res.ok) return { articles: [], hasMore: false };
  const html = await res.text();
  if (!html || !html.includes("<article")) return { articles: [], hasMore: false };
  const articles = parseKcnwArticles(html);
  return { articles, hasMore: articles.length === 10 };
}

export async function getAllNews(): Promise<NewsItem[]> {
  const [kns, kcna, ...rest] = await Promise.all([
    getKnsNews(),
    getKcnaWatchNews(),
    getKcnaNews(),
    getRodongNews(),
    getMinjuNews(),
    getPyongyangTimesNews(),
    getNaenaraNews(),
    getYouthNews(),
    getRyugyongNews(),
    getVokNews(),
    getKorarchNews(),
  ]);
  const all = [...kns, ...kcna, ...rest.flat()];
  return all.sort((a, b) => b.dateValue - a.dateValue);
}

// ---------------------------------------------------------------- New DPRK sources
// All .kp sites only work over plain HTTP (port 80) — HTTPS returns nothing.
// The origin is flaky/intermittent, so every .kp fetch retries up to 3 times
// and every fetcher returns [] on failure instead of crashing the page.

const KP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// In-memory cache for .kp fetches. Next.js's data cache refuses items over 2MB
// (Rodong's homepage is ~4MB), so without this, every getAllNews() call would
// re-download the 4MB page — which made the build take >60s per article page.
// No TTL here (a TTL would need Date.now(), which breaks static prerendering):
// the cache lives only as long as the process, and on Vercel each serverless
// instance is short-lived, so fresh data is picked up when a new instance starts.
const kpCache = new Map<string, string>();

async function fetchKpText(url: string, revalidate = 1800, attempts = 3): Promise<string> {
  const cached = kpCache.get(url);
  if (cached) return cached;
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": KP_UA, Accept: "text/html,application/xhtml+xml" },
          next: { revalidate },
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
        const text = await res.text();
        if (!text || text.length < 500) throw new Error(`GET ${url} -> empty body`);
        kpCache.set(url, text);
        return text;
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1200));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`GET ${url} failed`);
}

/** "2026.11.15" / "[2026.11.15.]" / "2026-11-15" -> epoch ms. */
function parseDottedDate(s: string): number {
  const m = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!m) return 0;
  const t = Date.parse(`${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`);
  return Number.isNaN(t) ? 0 : t;
}

function fmtDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

function absKp(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function proxyImg(src: string): string | null {
  if (!src) return null;
  if (src.startsWith("http")) return `/api/img?u=${encodeURIComponent(src)}`;
  return null;
}

// --- KCNA direct (English) ---
export async function getKcnaNews(): Promise<NewsItem[]> {
  try {
    const html = await fetchKpText("http://www.kcna.kp/en/");
    const $ = cheerio.load(html);
    const items: NewsItem[] = [];
    const seen = new Set<string>();
    $("div.article h5.block a[href*='/article/detail/']").each((_, a) => {
      const $a = $(a);
      const href = $a.attr("href") || "";
      const m = href.match(/\/([a-z]{2})\/article\/detail\/([0-9a-f]{32})/);
      if (!m || seen.has(m[2])) return;
      seen.add(m[2]);
      const title = $a.text().replace(/\s+/g, " ").trim();
      if (!title) return;
      const dateRaw = $a.closest("h5").find("span.publish_date nobr").text().trim();
      const dv = parseDottedDate(dateRaw);
      items.push({
        id: `kcnad-${m[2]}`,
        title,
        excerpt: "",
        date: dv ? fmtDate(dv) : dateRaw.replace(/[\[\].]/g, ""),
        dateValue: dv || 0,
        image: null,
        source: "KCNA",
        kind: "full",
        lang: "en",
        articleUrl: `http://www.kcna.kp/en/article/detail/${m[2]}`,
      });
    });
    return items;
  } catch {
    return [];
  }
}

// --- Rodong Sinmun (Korean) ---
export async function getRodongNews(): Promise<NewsItem[]> {
  try {
    const html = await fetchKpText("http://www.rodong.rep.kp/ko/");
    const $ = cheerio.load(html);
    const items: NewsItem[] = [];
    const seen = new Set<string>();
    $("a[href^='index.php?']").each((_, a) => {
      const $a = $(a);
      const href = $a.attr("href") || "";
      const q = href.replace(/^index\.php\?/, "");
      if (!q || q.length < 10) return;
      let decoded = "";
      try {
        decoded = Buffer.from(q, "base64").toString("utf-8");
      } catch {
        return;
      }
      // Decoded form: "12@2026-11-12-058@1@1@@0@1@" — article links carry a date.
      const dm = decoded.match(/(\d{4}-\d{2}-\d{2})-(\d+)/);
      if (!dm || seen.has(q)) return;
      seen.add(q);
      const title = $a.text().replace(/\s+/g, " ").trim();
      if (!title || title.length < 4) return;
      const dv = Date.parse(dm[1]);
      items.push({
        id: `rodong-${dm[1]}-${dm[2]}`,
        title,
        excerpt: "",
        date: dm[1],
        dateValue: dv,
        image: null,
        source: "Rodong Sinmun",
        kind: "full",
        lang: "ko",
        articleUrl: `http://www.rodong.rep.kp/ko/${href}`,
      });
    });
    return items;
  } catch {
    return [];
  }
}

// --- Minju Joson (Korean, list only — article pages return the list) ---
export async function getMinjuNews(): Promise<NewsItem[]> {
  try {
    const html = await fetchKpText("http://www.minju.rep.kp/");
    const $ = cheerio.load(html);
    const items: NewsItem[] = [];
    const seen = new Set<string>();
    $("a[href*='/Home/index/disp/']").each((_, a) => {
      const $a = $(a);
      const href = $a.attr("href") || "";
      const m = href.match(/\/Home\/index\/disp\/(\d+)\/ko/);
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);
      const title = $a.text().replace(/\s+/g, " ").trim();
      if (!title || title.length < 4) return;
      // Date sits in the sibling [YYYY.MM.DD.] element.
      const row = $a.closest("div.row");
      const dateRaw = row.find("font").last().text().trim() || row.parent().find("font").last().text().trim();
      const dv = parseDottedDate(dateRaw);
      items.push({
        id: `minju-${m[1]}`,
        title,
        excerpt: "",
        date: dv ? fmtDate(dv) : dateRaw.replace(/[\[\].]/g, ""),
        dateValue: dv || 0,
        image: null,
        source: "Minju Joson",
        kind: "excerpt",
        lang: "ko",
        articleUrl: `http://www.minju.rep.kp${href}`,
      });
    });
    return items;
  } catch {
    return [];
  }
}

// --- The Pyongyang Times (English) ---
export async function getPyongyangTimesNews(): Promise<NewsItem[]> {
  try {
    const html = await fetchKpText("http://www.pyongyangtimes.com.kp/");
    const $ = cheerio.load(html);
    const items: NewsItem[] = [];
    const seen = new Set<string>();
    $("a[href*='blogid=']").each((_, a) => {
      const $a = $(a);
      const href = $a.attr("href") || "";
      const m = href.match(/blogid=([0-9a-f]+)/);
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);
      const title = $a.text().replace(/\s+/g, " ").trim().replace(/\[\d{4}-\d{2}-\d{2}\]$/, "").trim();
      if (!title || title.length < 4) return;
      // Date: bracketed [YYYY-MM-DD] in the title, else the item's image path.
      let dv = 0;
      const dm = $a.text().match(/\[(\d{4}-\d{2}-\d{2})\]/);
      if (dm) dv = Date.parse(dm[1]);
      if (!dv) {
        const img = $a.closest("div").parent().find("img").first().attr("src") || "";
        const im = img.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
        if (im) dv = Date.parse(`${im[1]}-${im[2]}-${im[3]}`);
      }
      items.push({
        id: `pytimes-${m[1]}`,
        title,
        excerpt: "",
        date: dv ? fmtDate(dv) : "",
        dateValue: dv || 0,
        image: null,
        source: "Pyongyang Times",
        kind: "full",
        lang: "en",
        articleUrl: absKp("http://www.pyongyangtimes.com.kp/", href),
      });
    });
    return items;
  } catch {
    return [];
  }
}

// --- Naenara (Korean, list only — hash-based SPA, no fetchable article page) ---
export async function getNaenaraNews(): Promise<NewsItem[]> {
  try {
    const html = await fetchKpText("http://naenara.com.kp/");
    const $ = cheerio.load(html);
    const items: NewsItem[] = [];
    const seen = new Set<string>();
    // Articles carry fname="kkk26111201" / "k26111401" + artdate="2026-11-12".
    $("[fname]").each((_, el) => {
      const $el = $(el);
      const fname = $el.attr("fname") || "";
      const artdate = $el.attr("artdate") || "";
      if (!fname || seen.has(fname)) return;
      seen.add(fname);
      const title = $el.text().replace(/\s+/g, " ").trim();
      if (!title || title.length < 4) return;
      const dv = parseDottedDate(artdate);
      items.push({
        id: `naenara-${fname}`,
        title,
        excerpt: "",
        date: dv ? fmtDate(dv) : artdate,
        dateValue: dv || 0,
        image: null,
        source: "Naenara",
        kind: "excerpt",
        lang: "ko",
      });
    });
    return items;
  } catch {
    return [];
  }
}

// --- Youth Sinmun (Korean, list only — article pages return HTTP 500) ---
export async function getYouthNews(): Promise<NewsItem[]> {
  try {
    const html = await fetchKpText("http://www.youth.rep.kp/index.php/today/ko");
    const $ = cheerio.load(html);
    const items: NewsItem[] = [];
    const seen = new Set<string>();
    $("a.article-link[data-url]").each((_, a) => {
      const $a = $(a);
      const dataUrl = $a.attr("data-url") || "";
      const m = dataUrl.match(/^(\d{4})\/(\d{2})\/(\d{2})\/(\d+)/);
      if (!m || seen.has(dataUrl)) return;
      seen.add(dataUrl);
      const title = $a
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      if (!title || title.length < 4) return;
      const dv = Date.parse(`${m[1]}-${m[2]}-${m[3]}`);
      items.push({
        id: `youth-${m[1]}${m[2]}${m[3]}-${m[4]}`,
        title,
        excerpt: "",
        date: `${m[1]}-${m[2]}-${m[3]}`,
        dateValue: dv,
        image: null,
        source: "Youth Sinmun",
        kind: "excerpt",
        lang: "ko",
      });
    });
    return items;
  } catch {
    return [];
  }
}

// --- Ryugyong (Korean, photo items — a photo/video site, no article text) ---
export async function getRyugyongNews(): Promise<NewsItem[]> {
  try {
    const html = await fetchKpText("http://mediaryugyong.com.kp/");
    const $ = cheerio.load(html);
    const items: NewsItem[] = [];
    const seen = new Set<string>();
    // Revolutionary-activity photo items: /data/rev/{id}/...jpg with a title + [date].
    $("a[href^='/data/rev/']").each((_, a) => {
      const $a = $(a);
      const href = $a.attr("href") || "";
      const m = href.match(/^\/data\/rev\/(\d+)\//);
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);
      const text = $a.text().replace(/\s+/g, " ").trim();
      if (!text) return;
      const dm = text.match(/\[(\d{4})\.(\d{1,2})\.(\d{1,2})\.?\]/);
      const title = text.replace(/\[\d{4}\.\d{1,2}\.\d{1,2}\.?\]$/, "").trim();
      if (!title) return;
      const dv = dm ? Date.parse(`${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}`) : 0;
      items.push({
        id: `ryugyong-rev-${m[1]}`,
        title,
        excerpt: "",
        date: dv ? fmtDate(dv) : "",
        dateValue: dv || 0,
        image: proxyImg(`http://mediaryugyong.com.kp${href}`),
        source: "Ryugyong",
        kind: "excerpt",
        lang: "ko",
      });
    });
    return items;
  } catch {
    return [];
  }
}

// --- Voice of Korea (Korean) ---
export async function getVokNews(): Promise<NewsItem[]> {
  try {
    const html = await fetchKpText("http://www.vok.rep.kp/");
    const $ = cheerio.load(html);
    const items: NewsItem[] = [];
    const seen = new Set<string>();
    $("a[href*='/index.php/'][href*='getDetail'], a[href*='/index.php/detail_com/']").each((_, a) => {
      const $a = $(a);
      const href = $a.attr("href") || "";
      if (seen.has(href)) return;
      seen.add(href);
      const raw = $a.text().replace(/\s+/g, " ").trim().replace(/^[·\-–]\s*/, "");
      if (!raw || raw.length < 4) return;
      const dm = raw.match(/\((\d{4})\.(\d{1,2})\.(\d{1,2})\)\s*$/);
      const title = raw.replace(/\(\d{4}\.\d{1,2}\.\d{1,2}\)\s*$/, "").trim();
      if (!title) return;
      const dv = dm ? Date.parse(`${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}`) : 0;
      items.push({
        id: `vok-${href.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)}`,
        title,
        excerpt: "",
        date: dv ? fmtDate(dv) : "",
        dateValue: dv || 0,
        image: null,
        source: "Voice of Korea",
        kind: "full",
        lang: "ko",
        articleUrl: href.startsWith("http") ? href : `http://www.vok.rep.kp${href}`,
      });
    });
    return items;
  } catch {
    return [];
  }
}

// --- Korean Architecture (English) ---
// The homepage list shows no dates — the date lives on each article page
// (a <span style="float:right;">YYYY.MM.DD.</span> next to the title), so we
// fetch the article pages to get real dates. Items whose page cannot be
// fetched get dateValue 0 and sort to the bottom.
export async function getKorarchNews(): Promise<NewsItem[]> {
  try {
    const html = await fetchKpText("http://koreanarchitecture.gov.kp/");
    const $ = cheerio.load(html);
    const found: { id: string; title: string; url: string }[] = [];
    const seen = new Set<string>();
    $("a[href*='kt='][href*='no=']").each((_, a) => {
      const $a = $(a);
      const href = $a.attr("href") || "";
      const m = href.match(/no=(\d+)/);
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);
      const title = $a.text().replace(/^\d+/, "").replace(/\s+/g, " ").trim();
      if (!title || title.length < 4) return;
      found.push({ id: `korarch-${m[1]}`, title, url: absKp("http://koreanarchitecture.gov.kp/", href) });
    });
    const items = await Promise.all(
      found.map(async (f) => {
        let dv = 0;
        try {
          const art = await fetchKpText(f.url, 3600, 2);
          const $a = cheerio.load(art);
          const dateText = $a("span[style*='float:right']").first().text().trim();
          dv = parseDottedDate(dateText);
          if (!dv) {
            const dm = art.match(/(\d{4})\.(\d{2})\.(\d{2})/);
            if (dm) dv = Date.parse(`${dm[1]}-${dm[2]}-${dm[3]}`);
          }
        } catch {
          dv = 0;
        }
        return {
          id: f.id,
          title: f.title,
          excerpt: "",
          date: dv ? fmtDate(dv) : "",
          dateValue: dv,
          image: null,
          source: "Korean Architecture" as const,
          kind: "full" as const,
          lang: "en" as const,
          articleUrl: f.url,
        };
      })
    );
    return items;
  } catch {
    return [];
  }
}

// --- Korean Stamp (new issues list) ---
export async function getStamps(): Promise<import("./types").StampIssue[]> {
  try {
    const html = await fetchKpText("http://korstamp.com.kp/");
    const $ = cheerio.load(html);
    const items: import("./types").StampIssue[] = [];
    const seen = new Set<string>();
    // New-issue cards link to /stamps/stampsInfo-en-YYYY-SpNNNN.html and PDFs.
    $("a[href*='stampsInfo-']").each((_, a) => {
      const $a = $(a);
      const href = $a.attr("href") || "";
      const m = href.match(/stampsInfo-en-(\d{4})-Sp(\d+)\.html/);
      if (!m || seen.has(m[2])) return;
      seen.add(m[2]);
      const card = $a.closest("div").parent();
      const text = card.text().replace(/\s+/g, " ").trim();
      const dm = text.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
      const dv = dm ? Date.parse(`${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}`) : 0;
      const pdf = $(`a[href*='/assets/stamps/pdf/']`).first().attr("href") || null;
      items.push({
        stockNo: `Sp${m[2]}`,
        title: $a.text().replace(/\s+/g, " ").trim() || `Stamp Sp${m[2]}`,
        date: dv ? fmtDate(dv) : "",
        dateValue: dv || 0,
        pdf: pdf ? proxyImg(`http://korstamp.com.kp${pdf}`) : null,
        detail: null,
        detailUrl: `http://korstamp.com.kp${href}`,
      });
    });
    // Also capture the headline new issue (stock range + date + PDF) from the homepage.
    const bodyText = $("body").text().replace(/\s+/g, " ");
    const hm = bodyText.match(/New Stock No\.\s*([\d-]+)\s*(\d{4}\.\d{1,2}\.\d{1,2})/);
    if (hm) {
      const dm = hm[2].match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
      const dv = dm ? Date.parse(`${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}`) : 0;
      const pdf = $("a[href*='/assets/stamps/pdf/']").first().attr("href") || null;
      if (!items.some((i) => i.stockNo === hm[1])) {
        items.unshift({
          stockNo: hm[1],
          title: `New Issue ${hm[1]}`,
          date: dv ? fmtDate(dv) : "",
          dateValue: dv || 0,
          pdf: pdf ? proxyImg(`http://korstamp.com.kp${pdf}`) : null,
          detail: null,
        });
      }
    }
    return items.sort((a, b) => b.dateValue - a.dateValue);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- Article
export async function getArticle(id: string): Promise<Article | null> {
  if (id.startsWith("kcna-")) {
    const idx = Number(id.slice(5));
    const items = await getKcnaWatchNews();
    const item = items[idx];
    if (!item) return null;
    const excerptOnlyNote =
      "Only an excerpt is shown here. The full text needs a live KCNA Watch session — the mirror's session is currently expired or not configured, so the complete article cannot be fetched right now.";
    // Full text first (authenticated session cookie); fall back to the excerpt.
    if (item.articleUrl) {
      const body = await getKcnaWatchArticleBody(item.articleUrl);
      if (body.ok) {
        return {
          id,
          title: item.title,
          date: item.date,
          image: item.image,
          source: "KCNA Watch",
          kind: "full",
          excerpt: item.excerpt,
          blocks: body.blocks,
        };
      }
      return {
        id,
        title: item.title,
        date: item.date,
        image: item.image,
        source: "KCNA Watch",
        kind: "excerpt",
        excerpt: item.excerpt,
        blocks: item.excerpt ? [{ type: "text", text: item.excerpt }] : [],
        note: excerptOnlyNote,
      };
    }
    return {
      id,
      title: item.title,
      date: item.date,
      image: item.image,
      source: "KCNA Watch",
      kind: "excerpt",
      excerpt: item.excerpt,
      blocks: item.excerpt ? [{ type: "text", text: item.excerpt }] : [],
      note: excerptOnlyNote,
    };
  }
  // KCNA Watch archive articles (from /news/archive search/browse).
  if (id.startsWith("kcnw-")) {
    const meta = decodeKcnwId(id);
    if (!meta) return null;
    const body = await getKcnaWatchArticleBody(meta.url);
    if (body.ok) {
      return {
        id,
        title: body.title || meta.title,
        date: body.date || meta.date,
        image: meta.image,
        source: "KCNA Watch",
        kind: "full",
        excerpt: meta.excerpt,
        blocks: body.blocks,
      };
    }
    return {
      id,
      title: meta.title,
      date: meta.date,
      image: meta.image,
      source: "KCNA Watch",
      kind: "excerpt",
      excerpt: meta.excerpt,
      blocks: meta.excerpt ? [{ type: "text", text: meta.excerpt }] : [],
      note:
        "Only an excerpt is shown here. The full text needs a live KCNA Watch session — the mirror's session is currently expired or not configured, so the complete article cannot be fetched right now.",
    };
  }
  // New .kp sources: look the item up in the combined feed, then fetch its
  // full body with the source's own selectors (or explain why there is none).
  if (
    id.startsWith("kcnad-") ||
    id.startsWith("rodong-") ||
    id.startsWith("minju-") ||
    id.startsWith("pytimes-") ||
    id.startsWith("naenara-") ||
    id.startsWith("youth-") ||
    id.startsWith("ryugyong-") ||
    id.startsWith("vok-") ||
    id.startsWith("korarch-")
  ) {
    const all = await getAllNews();
    const item = all.find((n) => n.id === id);
    if (!item) return null;
    const listOnlyNotes: Record<string, string> = {
      "Minju Joson":
        "Minju Joson's article pages return the article list instead of the article itself, so the full text cannot be fetched. This page mirrors the headline and date from the paper's front page.",
      Naenara:
        "Naenara loads its articles through a hash-based viewer, so the full text cannot be fetched server-side. This page mirrors the headline and date from the Naenara front page.",
      "Youth Sinmun":
        "Youth Sinmun's article pages return a server error (HTTP 500) when fetched, so the full text cannot be mirrored. This page mirrors the headline and date from the paper's article list.",
      Ryugyong:
        "Ryugyong is a photo and video centre, not a text newspaper — this item is a photo set. The photos are shown below via our image proxy.",
    };
    if (item.kind === "excerpt" || !item.articleUrl) {
      return {
        id,
        title: item.title,
        date: item.date,
        image: item.image,
        source: item.source,
        kind: "excerpt",
        excerpt: item.excerpt,
        blocks: item.excerpt ? [{ type: "text", text: item.excerpt }] : [],
        note: listOnlyNotes[item.source] ?? "The full text of this article is not available.",
      };
    }
    try {
      const html = await fetchKpText(item.articleUrl, 3600);
      const $ = cheerio.load(html);
      const blocks: ArticleBlock[] = [];
      const pushText = (t: string) => {
        const text = t.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        if (text) blocks.push({ type: "text", text });
      };
      if (item.source === "KCNA") {
        $("main article p").each((_, p) => pushText($(p).text()));
        $("main article img").each((_, img) => {
          const src = $(img).attr("src") || "";
          if (src.startsWith("http")) blocks.push({ type: "image", src: proxyImg(src) ?? src, alt: $(img).attr("alt") || "" });
        });
      } else if (item.source === "Rodong Sinmun") {
        $("#articleContent p.TextP, #articleContent p").each((_, p) => pushText($(p).text()));
        $("#articleContent img").each((_, img) => {
          const src = $(img).attr("src") || "";
          if (src.startsWith("http")) blocks.push({ type: "image", src: proxyImg(src) ?? src, alt: $(img).attr("alt") || "" });
        });
      } else if (item.source === "Pyongyang Times") {
        $("div.content p").each((_, p) => pushText($(p).text()));
        $("div.content img").each((_, img) => {
          const src = $(img).attr("src") || "";
          if (src.startsWith("http")) blocks.push({ type: "image", src: proxyImg(src) ?? src, alt: $(img).attr("alt") || "" });
          else if (src.startsWith("/")) blocks.push({ type: "image", src: proxyImg(`http://www.pyongyangtimes.com.kp${src}`) ?? "", alt: $(img).attr("alt") || "" });
        });
      } else if (item.source === "Voice of Korea") {
        const $body = $(".detail-content-body").first();
        const raw = $body.length ? $body.text() : $("body").text();
        raw.split(/\n\s*\n|\r\n\s*\r\n/).forEach((seg) => pushText(seg));
        $(".detail-content-body img").each((_, img) => {
          const src = $(img).attr("src") || "";
          if (src.startsWith("http")) blocks.push({ type: "image", src: proxyImg(src) ?? src, alt: $(img).attr("alt") || "" });
        });
      } else if (item.source === "Korean Architecture") {
        $("p.news-content").each((_, p) => pushText($(p).text()));
        $("div.content img, .view-block img").each((_, img) => {
          const src = $(img).attr("src") || "";
          if (src.startsWith("http")) blocks.push({ type: "image", src: proxyImg(src) ?? src, alt: $(img).attr("alt") || "" });
        });
      }
      if (!blocks.length) return null;
      return {
        id,
        title: item.title,
        date: item.date,
        image: item.image,
        source: item.source,
        kind: "full",
        excerpt: (blocks.find((b) => b.type === "text") as { text: string } | undefined)?.text ?? "",
        blocks,
      };
    } catch {
      return null;
    }
  }
  // KNS article: look up the link, then fetch the full body.
  const kns = await getKnsNews();
  const item = kns.find((n) => n.id === id);
  if (!item || !item.knsLink) return null;
  try {
    const html = await fetchText(item.knsLink, 3600);
    const $ = cheerio.load(html);
    const blocks: ArticleBlock[] = [];
    const $body = $("div.contents").first();
    const $scope = $body.length ? $body : $("body");
    $scope.find("p").each((_, p) => {
      const $p = $(p);
      const $img = $p.find("img").first();
      if ($img.length) {
        const src = $img.attr("src") || "";
        if (src.startsWith("http")) {
          blocks.push({ type: "image", src: `/api/img?u=${encodeURIComponent(src)}`, alt: $img.attr("alt") || "" });
        }
      }
      const text = $p
        .clone()
        .children("img")
        .remove()
        .end()
        .text()
        .replace(/\u00a0/g, " ")
        .trim();
      if (text) blocks.push({ type: "text", text });
    });
    return {
      id,
      title: item.title,
      date: item.date,
      image: item.image,
      source: "KNS",
      kind: "full",
      excerpt: blocks.find((b) => b.type === "text")?.type === "text" ? (blocks.find((b) => b.type === "text") as { text: string }).text : "",
      blocks,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- Recordings
interface RawMediaList {
  news: { title: string; url: string; date: string; slug: string }[];
  activities: { title: string; url: string; date: string; slug: string }[];
  societyAndCulture: { title: string; url: string; date: string; slug: string }[];
}

export async function getRecordings(): Promise<RecordingItem[]> {
  try {
    const raw = await fetchJson<RawMediaList>(`${KORYO_FRONT}/api/kctv/media-list`, 3600);
    const out: RecordingItem[] = [];
    for (const r of raw.news || []) out.push({ ...r, category: "news" });
    for (const r of raw.activities || []) out.push({ ...r, category: "activities" });
    for (const r of raw.societyAndCulture || []) out.push({ ...r, category: "society" });
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- Publications
interface RawPublication {
  id: number;
  title: string;
  description: string | null;
  category: string;
  publishedYear: string;
  fileSize: number;
}

export async function getPublications(): Promise<PublicationItem[]> {
  try {
    const raw = await fetchJson<RawPublication[]>(`${KORYO_FRONT}/api/publications`, 3600);
    return raw.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      publishedYear: p.publishedYear,
      fileSize: p.fileSize,
      cover: `/api/pubfile/publications/${p.id}/cover?v=pdfcover2`,
      view: `/api/pubfile/publications/${p.id}/view`,
      download: `/api/pubfile/publications/${p.id}/download`,
    }));
  } catch {
    return [];
  }
}

interface RawPeriodical {
  id: number;
  type: string;
  publication: string;
  slug: string;
  issueDate: string;
  fileName: string;
  hasThumb: boolean;
}

export async function getPeriodicals(): Promise<PeriodicalItem[]> {
  try {
    const raw = await fetchJson<RawPeriodical[]>(`${KORYO_FRONT}/api/periodicals`, 3600);
    return raw.map((p) => ({
      id: p.id,
      publication: p.publication,
      slug: p.slug,
      issueDate: p.issueDate,
      fileName: p.fileName,
      thumb: `/api/pubfile/periodicals/${p.id}/thumb?v=pdfcover2`,
      view: `/api/pubfile/periodicals/${p.id}/view`,
    }));
  } catch {
    return [];
  }
}

// Server-side data access. Every upstream call happens HERE (on the server),
// never in the browser — the sources send no CORS headers.
import * as cheerio from "cheerio";
import type {
  Article,
  ArticleBlock,
  ChannelId,
  EpgData,
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
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return (await res.json()) as T;
}

async function fetchText(url: string, revalidate = 3600): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return await res.text();
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
      });
    });
    return items;
  } catch {
    return [];
  }
}

export async function getAllNews(): Promise<NewsItem[]> {
  const [kns, kcna] = await Promise.all([getKnsNews(), getKcnaWatchNews()]);
  return [...kns, ...kcna].sort((a, b) => b.dateValue - a.dateValue);
}

// ---------------------------------------------------------------- Article
export async function getArticle(id: string): Promise<Article | null> {
  if (id.startsWith("kcna-")) {
    const idx = Number(id.slice(5));
    const items = await getKcnaWatchNews();
    const item = items[idx];
    if (!item) return null;
    return {
      id,
      title: item.title,
      date: item.date,
      image: item.image,
      source: "KCNA Watch",
      kind: "excerpt",
      excerpt: item.excerpt,
      blocks: item.excerpt ? [{ type: "text", text: item.excerpt }] : [],
      note:
        "Only an excerpt is available here. The full text on KCNA Watch requires a free KCNA Watch member account, and KCNA Watch blocks its article pages from being fetched, so the complete article cannot be mirrored on this site.",
    };
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

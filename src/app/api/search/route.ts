// Global search — aggregates every source on the server and returns grouped,
// filtered, sorted results. The browser never touches a source directly.
import { NextRequest, NextResponse } from "next/server";
import { DIRECTORY } from "@/data/directory";
import {
  getAllNews,
  getEpg,
  getPeriodicals,
  getPublications,
  getRecordings,
} from "@/lib/sources";
import { todayPyt, toMinutes, type ChannelId } from "@/lib/types";

export type SearchKind = "news" | "recording" | "publication" | "schedule" | "directory";

export interface SearchResultItem {
  kind: SearchKind;
  title: string;
  subtitle: string;
  date: string;
  dateValue: number;
  href: string;
  channel?: string;
  category?: string;
  source?: string;
  score: number;
}

const HANGUL = /[\u3131-\uD79D]/;

function parseDateValue(s: string): number {
  if (!s) return 0;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  const y = s.slice(0, 4);
  if (/^\d{4}$/.test(y)) return Date.parse(`${y}-01-01`);
  return 0;
}

function dayStart(s: string): number {
  return Date.parse(`${s}T00:00:00Z`);
}
function dayEnd(s: string): number {
  return Date.parse(`${s}T23:59:59Z`);
}

function datesInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return out;
  for (let t = start; t <= end && out.length < 7; t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const needle = q.toLowerCase();
  const type = (sp.get("type") || "all") as SearchKind | "all";
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";
  const channel = (sp.get("channel") || "all") as ChannelId | "all";
  const category = sp.get("category") || "all";
  const source = sp.get("source") || "all";
  const lang = (sp.get("lang") || "all") as "all" | "en" | "ko";
  const sort = (sp.get("sort") || "relevance") as "relevance" | "newest" | "oldest";

  const fromMs = from ? dayStart(from) : 0;
  const toMs = to ? dayEnd(to) : Number.POSITIVE_INFINITY;
  const inRange = (dv: number) => dv === 0 || (dv >= fromMs && dv <= toMs);
  const hasHangul = (s: string) => HANGUL.test(s);

  // EPG dates: today by default; the requested range (capped at 7 days) when given.
  const epgDates =
    from && to ? datesInRange(from, to) : [todayPyt()];
  const epgChannels: Exclude<ChannelId, "mansudae">[] =
    channel === "all" || channel === "mansudae"
      ? ["kctv", "sports", "ryongnamsan"]
      : [channel as Exclude<ChannelId, "mansudae">];

  const want = (k: SearchKind) => type === "all" || type === k;

  const [news, recordings, publications, periodicals, ...epgs] = await Promise.all([
    want("news") ? getAllNews() : Promise.resolve([]),
    want("recording") ? getRecordings() : Promise.resolve([]),
    want("publication") ? getPublications() : Promise.resolve([]),
    want("publication") ? getPeriodicals() : Promise.resolve([]),
    ...(want("schedule")
      ? epgDates.flatMap((d) => epgChannels.map((c) => getEpg(c, d)))
      : []),
  ]);

  const results: SearchResultItem[] = [];
  const facetCategories = new Set<string>();
  const facetChannels = new Set<string>();
  const facetSources = new Set<string>();

  const push = (item: SearchResultItem) => {
    if (item.category) facetCategories.add(item.category);
    if (item.channel) facetChannels.add(item.channel);
    if (item.source) facetSources.add(item.source);
    results.push(item);
  };

  // ---- News
  for (const n of news) {
    if (source !== "all" && n.source !== source) continue;
    if (!inRange(n.dateValue)) continue;
    if (lang === "ko" && !hasHangul(n.title)) continue;
    const inTitle = !needle || n.title.toLowerCase().includes(needle);
    const inExcerpt = !!needle && n.excerpt.toLowerCase().includes(needle);
    if (needle && !inTitle && !inExcerpt) continue;
    push({
      kind: "news",
      title: n.title,
      subtitle: `${n.source} · ${n.date}${n.kind === "excerpt" ? " · Excerpt only" : ""}`,
      date: n.date,
      dateValue: n.dateValue,
      href: `/news/${n.id}`,
      source: n.source,
      score: inTitle ? 3 : 1,
    });
  }

  // ---- Recordings
  for (const r of recordings) {
    if (category !== "all" && r.category !== category) continue;
    const dv = parseDateValue(r.date);
    if (!inRange(dv)) continue;
    if (lang === "ko" && !hasHangul(r.title)) continue;
    const inTitle = !needle || r.title.toLowerCase().includes(needle);
    if (needle && !inTitle && !r.date.includes(needle)) continue;
    push({
      kind: "recording",
      title: r.title,
      subtitle: `${r.category === "news" ? "8pm News" : r.category === "activities" ? "Revolutionary Activities" : "Society & Culture"} · ${r.date}`,
      date: r.date,
      dateValue: dv,
      href: `/recordings?play=${encodeURIComponent(r.slug)}`,
      category: r.category,
      score: inTitle ? 3 : 1,
    });
  }

  // ---- Publications + periodicals
  for (const p of publications) {
    const dv = parseDateValue(p.publishedYear);
    if (!inRange(dv)) continue;
    if (lang === "ko" && !hasHangul(p.title)) continue;
    const hay = `${p.title} ${(p.description ?? "")} ${p.category}`.toLowerCase();
    if (needle && !hay.includes(needle)) continue;
    push({
      kind: "publication",
      title: p.title,
      subtitle: `${p.category} · ${p.publishedYear}`,
      date: p.publishedYear,
      dateValue: dv,
      href: "/publications",
      category: p.category,
      score: p.title.toLowerCase().includes(needle) ? 3 : 1,
    });
  }
  for (const p of periodicals) {
    const dv = parseDateValue(p.issueDate);
    if (!inRange(dv)) continue;
    if (lang === "ko" && !hasHangul(p.publication)) continue;
    const hay = `${p.publication} ${p.fileName}`.toLowerCase();
    if (needle && !hay.includes(needle)) continue;
    push({
      kind: "publication",
      title: `${p.publication} — ${p.issueDate}`,
      subtitle: `Periodical · ${p.issueDate}`,
      date: p.issueDate,
      dateValue: dv,
      href: "/publications",
      category: "periodical",
      score: p.publication.toLowerCase().includes(needle) ? 3 : 1,
    });
  }

  // ---- Schedule (EPG)
  for (const epg of epgs as Awaited<ReturnType<typeof getEpg>>[]) {
    for (const prog of epg.programs) {
      const chId = epg.channel.startsWith("Athletic")
        ? "sports"
        : epg.channel.startsWith("Ryongnamsan")
          ? "ryongnamsan"
          : "kctv";
      if (category !== "all" && prog.category !== category) continue;
      const dv = Date.parse(`${epg.date}T${prog.start}:00+09:00`);
      const enMatch = !needle || prog.en.toLowerCase().includes(needle);
      const koMatch = !needle || prog.ko.toLowerCase().includes(needle);
      if (lang === "en" && !enMatch) continue;
      if (lang === "ko" && !koMatch) continue;
      if (lang === "all" && needle && !enMatch && !koMatch) continue;
      push({
        kind: "schedule",
        title: prog.en || prog.ko,
        subtitle: `${epg.channel} · ${epg.date} ${prog.start} – ${prog.end} PYT`,
        date: epg.date,
        dateValue: Number.isNaN(dv) ? 0 : dv,
        href: `/schedule?date=${epg.date}&channel=${chId}`,
        channel: chId,
        category: prog.category,
        score: enMatch || koMatch ? 3 : 1,
      });
    }
  }

  // ---- Directory
  for (const cat of DIRECTORY) {
    for (const entry of cat.entries) {
      if (category !== "all" && cat.id !== category) continue;
      if (lang === "ko" && !hasHangul(entry.name)) continue;
      const hay = `${entry.name} ${entry.description ?? ""} ${entry.url ?? ""}`.toLowerCase();
      if (needle && !hay.includes(needle)) continue;
      push({
        kind: "directory",
        title: entry.name,
        subtitle: `${cat.title} · ${entry.status}${entry.url ? ` · ${entry.url}` : ""}`,
        date: "",
        dateValue: 0,
        href: "/directory",
        category: cat.id,
        score: entry.name.toLowerCase().includes(needle) ? 3 : 1,
      });
    }
  }

  // ---- Sort
  const sorted = [...results].sort((a, b) => {
    if (sort === "newest") return b.dateValue - a.dateValue || b.score - a.score;
    if (sort === "oldest") return a.dateValue - b.dateValue || b.score - a.score;
    return b.score - a.score || b.dateValue - a.dateValue;
  });

  const grouped: Record<SearchKind, SearchResultItem[]> = {
    news: [],
    recording: [],
    publication: [],
    schedule: [],
    directory: [],
  };
  for (const r of sorted) {
    if (grouped[r.kind].length < 50) grouped[r.kind].push(r);
  }

  const counts: Record<SearchKind, number> = {
    news: sorted.filter((r) => r.kind === "news").length,
    recording: sorted.filter((r) => r.kind === "recording").length,
    publication: sorted.filter((r) => r.kind === "publication").length,
    schedule: sorted.filter((r) => r.kind === "schedule").length,
    directory: sorted.filter((r) => r.kind === "directory").length,
  };

  return NextResponse.json({
    query: q,
    counts,
    total: sorted.length,
    facets: {
      categories: [...facetCategories].sort(),
      channels: [...facetChannels].sort(),
      sources: [...facetSources].sort(),
    },
    results: grouped,
  });
}

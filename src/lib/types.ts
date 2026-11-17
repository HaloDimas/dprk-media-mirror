// Shared types for the DPRK Media Mirror.
export interface Program {
  start: string; // "HH:MM" Pyongyang Time
  end: string;
  en: string;
  ko: string;
  category: string;
}

export interface EpgData {
  channel: string;
  date: string;
  programs: Program[];
  source: "live" | "snapshot";
}

export type ChannelId = "kctv" | "sports" | "ryongnamsan" | "mansudae";

export interface ChannelInfo {
  id: ChannelId;
  name: string;
  korean: string;
  kind: "tv" | "radio";
  hls: string | null; // CDN channel key, null when not streaming yet
  status: "live" | "off-air" | "coming-soon";
  note: string;
  /** Broadcaster's own channel mark, served from /public/channels. */
  logo: string;
}

export const CHANNELS: ChannelInfo[] = [
  {
    id: "kctv",
    name: "Korean Central Television",
    korean: "조선중앙텔레비죤",
    kind: "tv",
    hls: "kctv",
    status: "live",
    note: "Main national channel",
    logo: "/channels/Korean-Central-Television.png",
  },
  {
    id: "sports",
    name: "Athletic Television",
    korean: "체육텔레비죤",
    kind: "tv",
    hls: "sports",
    status: "live",
    note: "Sports channel — broadcasts from late afternoon",
    logo: "/channels/Sports-TV.png",
  },
  {
    id: "ryongnamsan",
    name: "Ryongnamsan Television",
    korean: "룡남산텔레비죤",
    kind: "tv",
    hls: "ryongnamsan",
    status: "live",
    note: "Educational channel — weekdays only",
    logo: "/channels/Ryongnamsan-tv.png",
  },
  {
    id: "mansudae",
    name: "Mansudae Television",
    korean: "만수대텔레비죤",
    kind: "tv",
    hls: null,
    status: "coming-soon",
    note: "Coming soon — no stream or guide published yet",
    logo: "/channels/Mansudae-TV.png",
  },
];

export const RADIO_STATIONS = [
  { id: "kcbs", name: "Korean Central Broadcasting Station", korean: "조선중앙방송", hls: "kcbs", desc: "The main state broadcaster — news, announcements and music." },
  { id: "kcbs2", name: "KCBS-2", korean: "조선중앙방송 제2방송", hls: "kcbs2", desc: "The second programme of Korean Central Broadcasting." },
  { id: "pyfm", name: "Pyongyang FM", korean: "평양방송", hls: "pyfm", desc: "Music and entertainment station." },
] as const;

export type NewsSource =
  | "KNS"
  | "KCNA Watch"
  | "KCNA"
  | "Rodong Sinmun"
  | "Minju Joson"
  | "Pyongyang Times"
  | "Naenara"
  | "Youth Sinmun"
  | "Ryugyong"
  | "Voice of Korea"
  | "Korean Architecture";

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  date: string; // display string
  dateValue: number; // ms epoch for sorting
  image: string | null; // proxied image URL on our own site
  source: NewsSource;
  kind: "full" | "excerpt";
  /** Upstream article URL (server-side only — never rendered as a link out). */
  articleUrl?: string;
  /** "en" | "ko" — the article's language. */
  lang?: "en" | "ko";
  // KNS only:
  knsLink?: string;
}

export type ArticleBlock =
  | { type: "text"; text: string }
  | { type: "image"; src: string; alt: string };

export interface Article {
  id: string;
  title: string;
  date: string;
  image: string | null;
  source: NewsSource;
  kind: "full" | "excerpt";
  excerpt: string;
  blocks: ArticleBlock[];
  note?: string;
  /** Upstream article URL. Shown as a "read the original" link only when kind is "excerpt". */
  originalUrl?: string;
}

export interface KcnwArticle {
  /** Stable id for our own article page: "kcnw-" + base64url(JSON {u,t,d,e,i}). */
  id: string;
  title: string;
  url: string; // upstream kcnawatch.org article URL (server-side only)
  excerpt: string;
  date: string;
  dateValue: number;
  image: string | null; // proxied image URL on our own site
}

export interface StampIssue {
  stockNo: string;
  title: string;
  date: string;
  dateValue: number;
  pdf: string | null; // proxied PDF URL on our own site
  detail: string | null; // proxied detail-page URL (served through /api/img proxy is not used; detail opens on our site)
  detailUrl?: string; // upstream detail URL (server-side only)
}

export interface RecordingItem {
  title: string;
  url: string; // Dropbox raw mp4/mov — played in our own <video> player
  date: string;
  slug: string;
  category: "news" | "activities" | "society";
  thumb: string; // KoryoFront frame at t=5s (api/kctv/thumb) — served from the source, not stored here
}

export interface PublicationItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
  publishedYear: string;
  fileSize: number;
  cover: string; // proxied cover URL on our own site
  view: string; // proxied PDF view URL on our own site
  download: string; // proxied download URL on our own site
}

export interface PeriodicalItem {
  id: number;
  publication: string;
  slug: string;
  issueDate: string;
  fileName: string;
  thumb: string; // proxied thumbnail URL
  view: string; // proxied PDF view URL
}

/** "HH:MM" -> minutes since midnight. */
export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Current time in Pyongyang (UTC+9) as "HH:MM". */
export function nowPyt(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Today's date in Pyongyang as YYYY-MM-DD. */
export function todayPyt(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function findNowNext(programs: Program[], now: string): { now: Program | null; next: Program | null } {
  const n = toMinutes(now);
  let cur: Program | null = null;
  let nxt: Program | null = null;
  for (const p of programs) {
    if (n >= toMinutes(p.start) && n < toMinutes(p.end)) cur = p;
    if (toMinutes(p.start) > n && !nxt) nxt = p;
  }
  return { now: cur, next: nxt };
}

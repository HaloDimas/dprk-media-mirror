// Directory of North Korean websites, grouped by category.
//
// Live status verified by curl checks on 15 Nov 2026. Key finding:
// .kp sites do NOT work over HTTPS from this network — they only work over
// plain HTTP (port 80). Every https://*.kp request returned 000, while the
// same site over http:// returned 200. So .kp URLs below use http://.
// Even over HTTP the .kp origin is flaky/intermittent, so a mirror must
// fetch server-side over plain HTTP with retries + caching.
//
// Statuses:
//   "live"            — returned HTTP 200 on 15 Nov 2026 (over plain HTTP)
//   "flaky"           — domain is on the July 2026 active .kp list but was
//                       unreachable from here (000); retry later, not dead
//   "dead"            — confirmed dead (corroborated by Wikipedia former-
//                       domains list and Jan 2024 shutdown reporting)
//   "not-a-website"   — not a website at all (e.g. a software suite)
//   "mail-only"       — a mail server, not a website
//   "active"          — on the July 2026 active .kp list (live reachability
//                       from here NOT verified)
// No URL has been invented: entries without a confirmed domain have url: null.

export type DirectoryStatus =
  | "live"
  | "active"
  | "flaky"
  | "dead"
  | "not-a-website"
  | "mail-only";

export interface DirectoryEntry {
  name: string;
  /** Short description of what the site is. null = unknown yet. */
  description: string | null;
  /** Real site URL. null = no confirmed domain — do NOT guess one. */
  url: string | null;
  status: DirectoryStatus;
}

export interface DirectoryCategory {
  id: string;
  title: string;
  blurb: string;
  entries: DirectoryEntry[];
}

const e = (
  name: string,
  url: string | null,
  status: DirectoryStatus,
  description?: string
): DirectoryEntry => ({ name, url, status, description: description ?? null });

export const DIRECTORY: DirectoryCategory[] = [
  {
    id: "news-media",
    title: "Official News, Newspapers & Media",
    blurb: "State news agencies, party and government newspapers, broadcasters and media monitors.",
    entries: [
      e("KCNA (Korean Central News Agency)", "http://www.kcna.kp/", "live", "Full news wire in 5 languages (ko/en/zh/es/jp), photos and video. Articles at /{lang}/article/detail/{id}."),
      e("Rodong Sinmun", "http://www.rodong.rep.kp/", "live", "WPK daily newspaper. Flaky — sometimes returns empty/redirect; retry needed."),
      e("Minju Joson", "http://www.minju.rep.kp/", "live", "Cabinet / SPA Presidium newspaper; government affairs, laws, regulations."),
      e("The Pyongyang Times", "http://www.pyongyangtimes.com.kp/", "live", "Only English-language newspaper (weekly)."),
      e("Voice of Korea", "http://www.vok.rep.kp/", "live", "International shortwave radio in 9 languages. Audio player mechanism unconfirmed."),
      e("Youth Sinmun", "http://www.youth.rep.kp/", "live", "Youth newspaper (Youth Vanguard)."),
      e("Ryugyong", "http://mediaryugyong.com.kp/", "live", "Ryugyong Programming Center — photos and video of DPRK events."),
      e("Naenara (My Country)", "http://naenara.com.kp/", "live", "Government portal, multilingual; periodicals + KCNA news."),
      e("KCNA Watch", "https://kcnawatch.org", "live", "Independent KCNA monitor — not a .kp site; its latest headlines are mirrored on this site's News page."),
    ],
  },
  {
    id: "government",
    title: "Government & Public Institutions",
    blurb: "Ministries, state agencies and public organisations.",
    entries: [
      e("DPRK Portal", "http://www.dprkportal.kp/", "live", "Official website directory (the portal itself is called KwangYa)."),
      e("Ministry of Foreign Affairs", "http://www.mfa.gov.kp/", "live", "Statements and pronouncements."),
      e("Ministry of Public Health", "http://www.moph.gov.kp/", "live"),
      e("Maritime Administration", "http://www.ma.gov.kp/", "live", "Ship/seaman registry lookup, maritime laws, news."),
      e("Financial Intelligence Agency", "http://www.fia.law.kp/", "live", "Payments watchdog."),
      e("DPRK Red Cross Society", "http://dprkrcs.com.kp/", "flaky", "Domain active (July 2026 list) but unreachable from here — retry later, not proven dead."),
      e("Sports in the DPR Korea", "http://www.sdprk.org.kp/", "flaky", "Domain active (July 2026 list) but unreachable from here — retry later, not proven dead."),
      e("DPRK National Association of Disabled Organizations", "http://dprknado.org.kp/", "live"),
    ],
  },
  {
    id: "education-research",
    title: "Education & Research",
    blurb: "Universities, libraries and research institutions.",
    entries: [
      e("Kim Il Sung University", "http://www.ryongnamsan.edu.kp/", "live", "University history, study areas, research, exchange programmes."),
      e("Ryomyong", "http://www.ryomyong.edu.kp/", "live", "Education Committee."),
      e("Grand People's Study House", "http://www.gpsh.edu.kp/", "flaky", "Central library. Only port 8080 was tested (failed) — needs a retest on plain port 80."),
      e("Kim Chaek University of Technology", "http://www.kut.edu.kp/", "live", "Top technology university."),
      e("Korean Association of Social Scientists", "http://www.kass.org.kp/", "live", "Juche study association."),
      e("Mirae", "http://www.mirae.aca.kp/", "live", "State Commission of Science and Technology."),
      e("Buhung", "http://buhung.aca.kp/", "live", "Intellectual Property Association (IPA) — the DPRK's national IP office."),
      e("KZA", "http://www.kza.org.kp/", "live", "Korea Central Zoo (Pyongyang Central Zoo)."),
    ],
  },
  {
    id: "culture",
    title: "Books, Arts, Films & Culture",
    blurb: "Publishing, cinema, art, cuisine, stamps and architecture.",
    entries: [
      e("Publications of the DPRK", "http://www.korean-books.com.kp/", "live", "Korean Books — ideological books and picture books."),
      e("Korean Film", "http://korfilm.com.kp/", "flaky", "Korea Film Corporation. Domain active (July 2026 list) but unreachable from here — retry later."),
      e("Korean Art", "http://korart.sca.kp/", "live"),
      e("Korean Dishes", "http://www.cooks.org.kp/", "live", "Korean Association of Cooks. Homepage returns only a stub — content may live at a sub-path."),
      e("Korean Stamp", "http://korstamp.com.kp/", "live", "Korea Stamp Corporation. Use without www (www.korstamp.com.kp does not resolve)."),
      e("Korean Architecture", "http://koreanarchitecture.gov.kp/", "live", "Architectural heritage, projects, urban planning."),
    ],
  },
  {
    id: "tourism",
    title: "Tourism & Travel",
    blurb: "Tour operators and the national airline.",
    entries: [
      e("DPR Korea Tourism", "http://www.tourismdprk.gov.kp/", "live", "National Tourism Administration."),
      e("Korea International Youth and Children's Travel Company", "http://www.kiyctc.com.kp/", "live"),
      e("Air Koryo (National Airline)", "http://airkoryo.com.kp/", "flaky", "Domain active (July 2026 list) but unreachable from here — retry later, not proven dead."),
    ],
  },
  {
    id: "business",
    title: "Business, Trade & Economy",
    blurb: "Foreign trade, business information, insurance and funds.",
    entries: [
      e("Foreign Trade of DPR Korea", "http://www.kftrade.com.kp/", "flaky", "Only port 8888 was tested (failed) — needs a retest on plain port 80."),
      e("Manmulsang Business Information", "http://www.manmulsang.com.kp/", "live", "Commerce site promoting DPRK products for export."),
      e("Korea National Insurance Corporation", "http://knic.com.kp/", "live", "State insurance company."),
      e("KPEIC", "http://kpeic.com.kp/", "live", "Korea Publications Export & Import Corporation — exclusive agency for foreign sales of books/periodicals."),
      e("Korean Education Fund", "http://koredufund.org.kp/", "flaky", "Domain active (July 2026 list) but unreachable from here — retry later."),
      e("Korean Elderly Care Fund", "http://korelcfund.org.kp/", "flaky", "Domain active (July 2026 list) but unreachable from here — retry later."),
      e("Yongsaeng", "http://yongsaeng.org.kp/", "live"),
      e("Silibank", "http://silibank.net.kp/", "mail-only", "Mail server only — not a website."),
      e("Star Co", "http://star-co.net.kp/", "mail-only", "Mail server only — not a website."),
    ],
  },
  {
    id: "older",
    title: "Older / Discontinued",
    blurb: "Confirmed dead or former domains, kept for reference.",
    entries: [
      e("Uriminzokkiri", "http://www.uriminzokkiri.com/", "dead", "Went offline Jan 2024 when Pyongyang cut South-focused propaganda; still offline."),
      e("Sogwang", null, "not-a-website", "Not a website — Sogwang is the Red Star OS office suite and a state media corporation. No public site URL."),
      e("Tongil Voice", null, "dead", "Propaganda radio station beamed to South Korea; closed Jan 2024 and its website went offline then."),
      e("National Unity", "http://www.gnu.rep.kp/", "dead", "Grand National Unity / Pyongyang Broadcasting Station site; station closed Jan 2024."),
      e("Friend", "http://friend.com.kp/", "dead", "Korean Friendship Association (KFA) site; live until ~May 2026, now gone."),
      e("Korea Tourism (older domain)", "http://nta.gov.kp/", "dead", "National Tourism Administration, the older tourism domain (replaced by tourismdprk.gov.kp)."),
      e("Masikryong Ski Resort", "http://masikryong.com.kp/", "dead", "Former domain; does not resolve."),
    ],
  },
];

export const DIRECTORY_TOTAL = DIRECTORY.reduce((n, c) => n + c.entries.length, 0);

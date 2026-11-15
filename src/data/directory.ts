// Directory of North Korean websites, grouped by category.
//
// Domains below come from the authoritative list of active .kp domains
// (as of July 2026) provided by the user. Statuses:
//   "active"        — on the July 2026 active .kp list (domain verified on
//                     that list; live reachability from here is NOT claimed)
//   "unconfirmed"   — no domain in the active list; URL not confirmed
//   "likely-offline"— older/discontinued site, no domain, likely offline
//   "mail-only"     — a mail server, not a website
//   "checking"      — still being verified
// No URL has been invented: entries without a confirmed domain have url: null.

export type DirectoryStatus =
  | "active"
  | "unconfirmed"
  | "likely-offline"
  | "mail-only"
  | "checking";

export interface DirectoryEntry {
  name: string;
  /** Short description of what the site is. null = unknown yet. */
  description: string | null;
  /** Real site URL (https). null = no confirmed domain — do NOT guess one. */
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
      e("KCNA (Korean Central News Agency)", "https://kcna.kp", "active"),
      e("Rodong Sinmun", "https://rodong.rep.kp", "active"),
      e("Minju Joson", "https://minju.rep.kp", "active"),
      e("The Pyongyang Times", "https://pyongyangtimes.com.kp", "active"),
      e("Voice of Korea", "https://vok.rep.kp", "active"),
      e("Youth Sinmun", "https://youth.rep.kp", "active"),
      e("Ryugyong", "https://mediaryugyong.com.kp", "active"),
      e("Naenara (My Country)", "https://naenara.com.kp", "active"),
      e("KCNA Watch", "https://kcnawatch.org", "active", "Independent KCNA monitor — not a .kp site; its latest headlines are mirrored on this site's News page."),
    ],
  },
  {
    id: "government",
    title: "Government & Public Institutions",
    blurb: "Ministries, state agencies and public organisations.",
    entries: [
      e("DPRK Portal", "https://dprkportal.kp", "active", "Official website directory."),
      e("Ministry of Foreign Affairs", "https://mfa.gov.kp", "active"),
      e("Ministry of Public Health", "https://moph.gov.kp", "active"),
      e("Maritime Administration", "https://ma.gov.kp", "active"),
      e("Financial Intelligence Agency", "https://fia.law.kp", "active"),
      e("DPRK Red Cross Society", "https://dprkrcs.com.kp", "active"),
      e("Sports in the DPR Korea", "https://sdprk.org.kp", "active"),
      e("DPRK National Association of Disabled Organizations", "https://dprknado.org.kp", "active"),
    ],
  },
  {
    id: "education-research",
    title: "Education & Research",
    blurb: "Universities, libraries and research institutions.",
    entries: [
      e("Kim Il Sung University", null, "unconfirmed", "Not in the July 2026 active-domains list — URL not confirmed."),
      e("Ryomyong", "https://ryomyong.edu.kp", "active", "Education Committee."),
      e("Grand People's Study House", "https://gpsh.edu.kp", "active"),
      e("Kim Chaek University of Technology", "https://kut.edu.kp", "active"),
      e("Korean Association of Social Scientists", "https://kass.org.kp", "active"),
      e("Mirae", "https://mirae.aca.kp", "active", "Science and Technology."),
      e("Buhung", "https://buhung.aca.kp", "active"),
      e("KZA", "https://kza.org.kp", "active"),
      e("Ryongnamsan", "https://ryongnamsan.edu.kp", "active", "Education site — distinct from Ryongnamsan TV."),
    ],
  },
  {
    id: "culture",
    title: "Books, Arts, Films & Culture",
    blurb: "Publishing, cinema, art, cuisine, stamps and architecture.",
    entries: [
      e("Publications of the DPRK", "https://korean-books.com.kp", "active"),
      e("Korean Film", "https://korfilm.com.kp", "active"),
      e("Korean Art", "https://korart.sca.kp", "active"),
      e("Korean Dishes", "https://cooks.org.kp", "active"),
      e("Korean Stamp", "https://korstamp.com.kp", "active"),
      e("Korean Architecture", "https://koreanarchitecture.gov.kp", "active"),
    ],
  },
  {
    id: "tourism",
    title: "Tourism & Travel",
    blurb: "Tour operators and the national airline.",
    entries: [
      e("DPR Korea Tourism", "https://tourismdprk.gov.kp", "active"),
      e("Korea International Youth and Children's Travel Company", "https://kiyctc.com.kp", "active"),
      e("Air Koryo (National Airline)", "https://airkoryo.com.kp", "active"),
    ],
  },
  {
    id: "business",
    title: "Business, Trade & Economy",
    blurb: "Foreign trade, business information, insurance and funds.",
    entries: [
      e("Foreign Trade of DPR Korea", "https://kftrade.com.kp", "active"),
      e("Manmulsang Business Information", "https://manmulsang.com.kp", "active"),
      e("Korea National Insurance Corporation", "https://knic.com.kp", "active"),
      e("KPEIC", "https://kpeic.com.kp", "active"),
      e("Korean Education Fund", "https://koredufund.org.kp", "active"),
      e("Korean Elderly Care Fund", "https://korelcfund.org.kp", "active"),
      e("Yongsaeng", "https://yongsaeng.org.kp", "active"),
      e("Silibank", "https://silibank.net.kp", "mail-only", "Mail server only — not a website."),
      e("Star Co", "https://star-co.net.kp", "mail-only", "Mail server only — not a website."),
    ],
  },
  {
    id: "older",
    title: "Older / Possibly Discontinued",
    blurb: "Older domains that may no longer be maintained. No domain in the active list.",
    entries: [
      e("Uriminzokkiri", null, "likely-offline"),
      e("Sogwang", null, "likely-offline"),
      e("Tongil Voice", null, "likely-offline"),
      e("National Unity", null, "likely-offline"),
      e("Friend", null, "likely-offline"),
      e("Korea Tourism (older domain)", null, "likely-offline"),
      e("Masikryong Ski Resort", null, "likely-offline"),
    ],
  },
];

export const DIRECTORY_TOTAL = DIRECTORY.reduce((n, c) => n + c.entries.length, 0);

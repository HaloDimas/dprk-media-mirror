import type { MetadataRoute } from "next";

const BASE_URL = "https://dprkmedia.vercel.app";

// Static sitemap: the main pages only. Article pages are deliberately NOT
// listed — they are fetched live from flaky .kp sources, and making the
// sitemap depend on them would make it slow and unreliable. Search engines
// still discover articles through the news pages.
const PAGES: { path: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/live", changeFrequency: "daily", priority: 0.9 },
  { path: "/schedule", changeFrequency: "daily", priority: 0.9 },
  { path: "/news", changeFrequency: "daily", priority: 0.9 },
  { path: "/news/archive", changeFrequency: "weekly", priority: 0.7 },
  { path: "/radio", changeFrequency: "weekly", priority: 0.8 },
  { path: "/recordings", changeFrequency: "weekly", priority: 0.8 },
  { path: "/publications", changeFrequency: "weekly", priority: 0.8 },
  { path: "/directory", changeFrequency: "monthly", priority: 0.7 },
  { path: "/sources", changeFrequency: "monthly", priority: 0.7 },
  { path: "/status", changeFrequency: "daily", priority: 0.6 },
  { path: "/search", changeFrequency: "weekly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.4 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGES.map((p) => ({
    url: `${BASE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}

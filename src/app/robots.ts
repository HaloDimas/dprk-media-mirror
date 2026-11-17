import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // API routes are data endpoints, not pages — no need to crawl them.
      disallow: "/api/",
    },
    sitemap: "https://dprkmedia.vercel.app/sitemap.xml",
  };
}

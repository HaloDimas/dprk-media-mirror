import type { NextConfig } from "next";

// Content Security Policy. Notes:
// - 'unsafe-inline' for scripts/styles: Next.js App Router streams inline
//   <script> payloads (self.__next_f) and Tailwind needs inline styles; a
//   nonce-based policy would need middleware, which is out of scope.
// - Fonts are self-hosted by next/font (Geist) — no Google Fonts domain.
// - HLS playlists/segments come from the Cloudflare Worker proxy
//   (dprk-hls) with a same-origin /api/hls fallback; hls.js fetches them
//   via XHR (connect-src) while Safari native HLS loads them through the
//   media element (media-src), so both directives list the proxy + CDN.
// - Recording thumbnails come from KoryoFront (img-src must list it,
//   otherwise browsers block every thumbnail and cards show the fallback).
// - Vercel Analytics / Speed Insights scripts + beacons.
// - The PDF viewer iframe loads same-origin /api/pubfile URLs (frame-src).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://koryofront.org",
  "media-src 'self' blob: https://dprk-hls.hypothernia-apparel.workers.dev https://live.koryocdn.org",
  "connect-src 'self' https://dprk-hls.hypothernia-apparel.workers.dev https://live.koryocdn.org https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "font-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          // Belt-and-suspenders with frame-ancestors above (modern browsers
          // prefer frame-ancestors; X-Frame-Options covers older ones).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          // No HSTS here: Vercel already sends it for *.vercel.app domains.
        ],
      },
    ];
  },
};

export default nextConfig;

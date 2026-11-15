/**
 * DPRK Media Mirror — HLS proxy on Cloudflare Workers.
 *
 * Why this exists: the live TV/radio streams are proxied through Vercel
 * serverless functions (/api/hls), and every byte of video counts against
 * Vercel Hobby's 10 GB/month "Fast Origin Transfer" limit. One hour of
 * KCTV (1080p50, ~9.5 Mbps) is ~4.3 GB — a single viewer testing the
 * site already used 4.21 GB. Cloudflare Workers on the free plan have
 * NO bandwidth/egress charges (100k requests/day), so moving just the
 * HLS proxy here takes the video traffic off Vercel entirely. The
 * Next.js site itself stays on Vercel (pages, news, EPG — tiny JSON).
 *
 * Deploy: `npx wrangler deploy` (needs a free Cloudflare account), or
 * paste this file into a new Worker in the Cloudflare dashboard.
 * The Worker URL (e.g. https://dprk-hls.<you>.workers.dev) is then put
 * in the site as NEXT_PUBLIC_HLS_PROXY, and HlsPlayer/AudioPlayer use
 * it instead of /api/hls.
 *
 * The CDN (live.koryocdn.org) sends no CORS headers, so the browser must
 * never fetch it directly: every playlist and segment is fetched here
 * and all URLs inside playlists are rewritten to point back at this
 * Worker. This mirrors src/app/api/hls/[...path]/route.ts.
 */

const CDN = "https://live.koryocdn.org";
const ALLOWED = new Set(["kctv", "sports", "ryongnamsan", "kcbs", "kcbs2", "pyfm"]);

/** Rewrite every URI inside an HLS playlist so it goes through this Worker. */
function rewritePlaylist(text, playlistUrl, selfOrigin) {
  const toProxy = (uri) => {
    try {
      const abs = new URL(uri, playlistUrl);
      if (abs.origin !== new URL(CDN).origin) return uri;
      return `${selfOrigin}${abs.pathname}${abs.search}`;
    } catch {
      return uri;
    }
  };
  // URI="..." attributes (EXT-X-MEDIA, EXT-X-KEY, EXT-X-MAP)
  let out = text.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${toProxy(uri)}"`);
  // Bare URI lines (segment / variant playlist references)
  out = out
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return line;
      return toProxy(t);
    })
    .join("\n");
  return out;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight.
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Path is /<channel>/<file>, e.g. /kctv/index.m3u8 or /kcbs/index123.ts
    const path = url.pathname.replace(/^\/+/, "").split("/");
    const channel = path[0];
    if (!channel || !ALLOWED.has(channel)) {
      return new Response(JSON.stringify({ error: "Unknown stream" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    if (path.some((p) => p === ".." || p.includes(".."))) {
      return new Response(JSON.stringify({ error: "Bad path" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const upstreamUrl = `${CDN}/${path.join("/")}${url.search}`;
    let upstream;
    try {
      upstream = await fetch(upstreamUrl, {
        headers: { "User-Agent": "DPRK-Media-Mirror/1.0" },
        cf: { cacheTtl: 0 },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Upstream stream unavailable" }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: `Upstream returned ${upstream.status}` }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const contentType = upstream.headers.get("content-type") || "";
    const isPlaylist =
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegURL") ||
      upstreamUrl.endsWith(".m3u8");

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cache-Control", "no-store");

    if (isPlaylist) {
      const text = await upstream.text();
      headers.set("Content-Type", "application/vnd.apple.mpegurl");
      return new Response(rewritePlaylist(text, upstreamUrl, url.origin), { headers });
    }

    // Segment / subtitle file: stream the bytes through unchanged.
    headers.set("Content-Type", contentType || "application/octet-stream");
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    return new Response(upstream.body, { headers });
  },
};

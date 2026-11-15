import { NextRequest, NextResponse } from "next/server";

// HLS proxy for the live CDN (live.koryocdn.org). The CDN sends no CORS
// headers, so the browser must never fetch it directly: every playlist and
// segment is fetched server-side here and all URLs inside playlists are
// rewritten to point back at this same proxy route.

const CDN = "https://live.koryocdn.org";
const ALLOWED = new Set(["kctv", "sports", "ryongnamsan", "kcbs", "kcbs2", "pyfm"]);

/** Rewrite every URI inside an HLS playlist so it goes through this proxy. */
function rewritePlaylist(text: string, playlistUrl: string): string {
  const toProxy = (uri: string): string => {
    try {
      const abs = new URL(uri, playlistUrl);
      if (abs.origin !== new URL(CDN).origin) return uri;
      return `/api/hls${abs.pathname}${abs.search}`;
    } catch {
      return uri;
    }
  };
  // URI="..." attributes (EXT-X-MEDIA, EXT-X-KEY, EXT-X-MAP)
  let out = text.replace(/URI="([^"]+)"/g, (_m, uri: string) => `URI="${toProxy(uri)}"`);
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const channel = path[0];
  if (!channel || !ALLOWED.has(channel)) {
    return NextResponse.json({ error: "Unknown stream" }, { status: 404 });
  }
  // Reject path traversal attempts.
  if (path.some((p) => p === ".." || p.includes(".."))) {
    return NextResponse.json({ error: "Bad path" }, { status: 400 });
  }
  const upstreamUrl = `${CDN}/${path.join("/")}${request.nextUrl.search}`;
  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { "User-Agent": "DPRK-Media-Mirror/1.0" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Upstream stream unavailable" }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream returned ${upstream.status}` }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "";
  const isPlaylist = contentType.includes("mpegurl") || contentType.includes("x-mpegURL") || upstreamUrl.endsWith(".m3u8");

  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "no-store");

  if (isPlaylist) {
    const text = await upstream.text();
    headers.set("Content-Type", "application/vnd.apple.mpegurl");
    return new NextResponse(rewritePlaylist(text, upstreamUrl), { headers });
  }

  // Segment / subtitle file: stream the bytes through unchanged.
  headers.set("Content-Type", contentType || "application/octet-stream");
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  return new NextResponse(upstream.body, { headers });
}

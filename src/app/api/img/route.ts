import { NextRequest, NextResponse } from "next/server";

// Generic image proxy for article images, restricted to the two image hosts
// the mirrored articles actually use. Used for KNS article photos
// (koreanewsservice.com) and KCNA Watch thumbnails (assets.korearisk.com).

const ALLOWED_HOSTS = new Set(["koreanewsservice.com", "assets.korearisk.com"]);

export async function GET(request: NextRequest) {
  const u = request.nextUrl.searchParams.get("u");
  if (!u) return NextResponse.json({ error: "Missing u" }, { status: 400 });
  let url: URL;
  try {
    url = new URL(u);
  } catch {
    return NextResponse.json({ error: "Bad URL" }, { status: 400 });
  }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      headers: { "User-Agent": "DPRK-Media-Mirror/1.0" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Image unavailable" }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream returned ${upstream.status}` }, { status: 502 });
  }
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
  headers.set("Cache-Control", "public, max-age=86400");
  return new NextResponse(upstream.body, { headers });
}

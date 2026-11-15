import { NextRequest, NextResponse } from "next/server";
import { KORYO_FRONT } from "@/lib/sources";

// Proxies Koryo Front's KNS article images (/api/kns-image/{hash}) through
// our own site.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const hash = path.join("/");
  if (!/^[A-Za-z0-9._/-]+$/.test(hash) || hash.includes("..")) {
    return NextResponse.json({ error: "Bad image" }, { status: 400 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(`${KORYO_FRONT}/api/kns-image/${hash}`, {
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

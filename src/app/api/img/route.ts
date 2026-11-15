import { NextRequest, NextResponse } from "next/server";

// Generic image/file proxy for mirrored article media. Restricted to the hosts
// the mirrored articles actually use. .kp sites only work over plain HTTP,
// so http: is allowed for them; the other hosts are https-only.
//
// Allowed hosts:
// - koreanewsservice.com, assets.korearisk.com (KNS / KCNA Watch)
// - www.kcna.kp, www.rodong.rep.kp, www.minju.rep.kp, www.pyongyangtimes.com.kp,
//   naenara.com.kp, www.youth.rep.kp, mediaryugyong.com.kp, www.vok.rep.kp,
//   koreanarchitecture.gov.kp, korstamp.com.kp (.kp sources, HTTP only)

const HTTPS_HOSTS = new Set(["koreanewsservice.com", "assets.korearisk.com"]);
const KP_HOSTS = new Set([
  "www.kcna.kp",
  "kcna.kp",
  "www.rodong.rep.kp",
  "www.minju.rep.kp",
  "www.pyongyangtimes.com.kp",
  "naenara.com.kp",
  "www.youth.rep.kp",
  "mediaryugyong.com.kp",
  "www.vok.rep.kp",
  "koreanarchitecture.gov.kp",
  "korstamp.com.kp",
]);

export async function GET(request: NextRequest) {
  const u = request.nextUrl.searchParams.get("u");
  if (!u) return NextResponse.json({ error: "Missing u" }, { status: 400 });
  let url: URL;
  try {
    url = new URL(u);
  } catch {
    return NextResponse.json({ error: "Bad URL" }, { status: 400 });
  }
  const isKp = KP_HOSTS.has(url.hostname);
  const ok =
    (url.protocol === "https:" && HTTPS_HOSTS.has(url.hostname)) ||
    (url.protocol === "http:" && isKp);
  if (!ok) {
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

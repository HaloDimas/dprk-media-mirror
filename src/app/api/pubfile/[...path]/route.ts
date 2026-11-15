import { NextRequest, NextResponse } from "next/server";
import { KORYO_FRONT } from "@/lib/sources";

// Proxies Koryo Front file endpoints through our own site so covers and PDFs
// are served from here, never by linking out:
//   /api/pubfile/publications/{id}/cover?v=pdfcover2
//   /api/pubfile/publications/{id}/view
//   /api/pubfile/publications/{id}/download
//   /api/pubfile/periodicals/{id}/thumb?v=pdfcover2
//   /api/pubfile/periodicals/{id}/view

const ALLOWED_KIND = new Set(["publications", "periodicals"]);
const ALLOWED_ACTION = new Set(["cover", "view", "download", "thumb"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [kind, id, action] = path;
  if (!ALLOWED_KIND.has(kind) || !/^\d+$/.test(id || "") || !ALLOWED_ACTION.has(action)) {
    return NextResponse.json({ error: "Unknown file" }, { status: 404 });
  }
  const upstreamUrl = `${KORYO_FRONT}/api/${kind}/${id}/${action}${request.nextUrl.search}`;
  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { "User-Agent": "DPRK-Media-Mirror/1.0" },
      // PDFs are large; do not let Next cache them.
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "File unavailable" }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream returned ${upstream.status}` }, { status: 502 });
  }
  const headers = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) headers.set("Content-Type", ct);
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  if (action === "download") {
    headers.set("Content-Disposition", `attachment; filename="${kind}-${id}.pdf"`);
  } else if (ct?.includes("pdf")) {
    headers.set("Content-Disposition", "inline");
  }
  // Covers/thumbs can be cached by the browser for a day.
  headers.set("Cache-Control", ct?.startsWith("image/") ? "public, max-age=86400" : "no-store");
  return new NextResponse(upstream.body, { headers });
}

import { NextRequest, NextResponse } from "next/server";
import { getKcnaWatchArticleBody } from "@/lib/sources";

// KCNA Watch full article text (authenticated session).
// The session cookie is read ONLY from process.env.KCNW_COOKIE inside
// getKcnaWatchArticleBody — it is never hardcoded, logged, or in the repo.
// Query: ?url=<full https://kcnawatch.org/newstream/... article URL>
//   200 { blocks, title, date } — full body (cached 1 day; article text never changes)
//   401 { error: "kcnawatch_session_expired" } — cookie expired, fall back to excerpt
//   503 { error: "kcnawatch_not_configured" } — KCNW_COOKIE not set
//   502 { error: "kcnawatch_unavailable" } — upstream failure
//   404 { error: "kcnawatch_not_found" } — article not found
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Bad URL" }, { status: 400 });
  }
  // Only KCNA Watch article URLs are allowed (no open proxy).
  if (parsed.protocol !== "https:" || parsed.hostname !== "kcnawatch.org") {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }
  const body = await getKcnaWatchArticleBody(url);
  if (!body.ok) {
    const status =
      body.error === "session_expired"
        ? 401
        : body.error === "not_configured"
          ? 503
          : body.error === "not_found"
            ? 404
            : 502;
    return NextResponse.json(
      { error: `kcnawatch_${body.error}` },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
  const res = NextResponse.json({ blocks: body.blocks, title: body.title, date: body.date });
  res.headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=86400");
  return res;
}

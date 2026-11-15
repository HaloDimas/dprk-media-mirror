import { NextRequest, NextResponse } from "next/server";
import { getKcnwSearch } from "@/lib/sources";

// Search the full 1.37M-article KCNA Watch archive (authenticated).
// Query: ?q=<query>&source=<source-category-id>&from=<offset>&sort=<|pop>
//   200 { count, articles, hasMore } — 20 articles per page
//   401 { error: "kcnw_search_unavailable" } — session expired (UI shows a graceful state)
//   503 { error: "kcnw_not_configured" } — KCNW_COOKIE not set
// Note: the upstream start/end date params are non-functional — no date filter.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const source = sp.get("source") ?? "";
  const from = Math.max(0, Number(sp.get("from") ?? 0) || 0);
  const sort = sp.get("sort") ?? "";
  if (!q.trim()) return NextResponse.json({ error: "Missing q" }, { status: 400 });
  const result = await getKcnwSearch(q.trim(), source, from, sort);
  if (result.error === "not_configured") {
    return NextResponse.json({ error: "kcnw_not_configured" }, { status: 503 });
  }
  if (result.error === "search_unavailable") {
    return NextResponse.json({ error: "kcnw_search_unavailable" }, { status: 401 });
  }
  return NextResponse.json({ count: result.count, articles: result.articles, hasMore: result.hasMore });
}

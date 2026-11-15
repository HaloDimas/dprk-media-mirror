import { NextRequest, NextResponse } from "next/server";
import { getKcnwLatest } from "@/lib/sources";

// Browse the latest KCNA Watch articles (anonymous, back to ~2015, ~430k).
// Query: ?from=<offset>&sort=<|pop>&lang=<|kr|en-US>
//   200 { articles, hasMore } — 10 articles per page; hasMore false when empty.
// Hard cap: from=430000 works, from=440000 returns empty. Ordering gets
// non-monotonic at deep offsets (duplicates/gaps possible).
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const from = Math.max(0, Number(sp.get("from") ?? 0) || 0);
  const sort = sp.get("sort") ?? "";
  const lang = sp.get("lang") ?? "";
  const result = await getKcnwLatest(from, sort, lang);
  return NextResponse.json({ articles: result.articles, hasMore: result.hasMore });
}

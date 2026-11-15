import { NextResponse } from "next/server";
import { getKorarchNews } from "@/lib/sources";

// Korean Architecture — latest articles, fetched server-side over plain HTTP from the
// .kp origin (it does not work over HTTPS) with retries. Returns [] if the
// origin is unreachable, so the page never crashes.
export async function GET() {
  try {
    const items = await getKorarchNews();
    return NextResponse.json({ source: "Korean Architecture", count: items.length, items });
  } catch {
    return NextResponse.json({ source: "Korean Architecture", count: 0, items: [] });
  }
}

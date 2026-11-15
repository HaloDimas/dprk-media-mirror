import { NextResponse } from "next/server";
import { getYouthNews } from "@/lib/sources";

// Youth Sinmun — latest articles, fetched server-side over plain HTTP from the
// .kp origin (it does not work over HTTPS) with retries. Returns [] if the
// origin is unreachable, so the page never crashes.
export async function GET() {
  try {
    const items = await getYouthNews();
    return NextResponse.json({ source: "Youth Sinmun", count: items.length, items });
  } catch {
    return NextResponse.json({ source: "Youth Sinmun", count: 0, items: [] });
  }
}

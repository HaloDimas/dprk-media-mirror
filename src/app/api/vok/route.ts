import { NextResponse } from "next/server";
import { getVokNews } from "@/lib/sources";

// Voice of Korea — latest articles, fetched server-side over plain HTTP from the
// .kp origin (it does not work over HTTPS) with retries. Returns [] if the
// origin is unreachable, so the page never crashes.
export async function GET() {
  try {
    const items = await getVokNews();
    return NextResponse.json({ source: "Voice of Korea", count: items.length, items });
  } catch {
    return NextResponse.json({ source: "Voice of Korea", count: 0, items: [] });
  }
}

import { NextResponse } from "next/server";
import { getRyugyongNews } from "@/lib/sources";

// Ryugyong — latest articles, fetched server-side over plain HTTP from the
// .kp origin (it does not work over HTTPS) with retries. Returns [] if the
// origin is unreachable, so the page never crashes.
export async function GET() {
  try {
    const items = await getRyugyongNews();
    return NextResponse.json({ source: "Ryugyong", count: items.length, items });
  } catch {
    return NextResponse.json({ source: "Ryugyong", count: 0, items: [] });
  }
}

import { NextResponse } from "next/server";
import { getPyongyangTimesNews } from "@/lib/sources";

// Pyongyang Times — latest articles, fetched server-side over plain HTTP from the
// .kp origin (it does not work over HTTPS) with retries. Returns [] if the
// origin is unreachable, so the page never crashes.
export async function GET() {
  try {
    const items = await getPyongyangTimesNews();
    return NextResponse.json({ source: "Pyongyang Times", count: items.length, items });
  } catch {
    return NextResponse.json({ source: "Pyongyang Times", count: 0, items: [] });
  }
}

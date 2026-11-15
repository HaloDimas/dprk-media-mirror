import { NextResponse } from "next/server";
import { getRodongNews } from "@/lib/sources";

// Rodong Sinmun — latest articles, fetched server-side over plain HTTP from the
// .kp origin (it does not work over HTTPS) with retries. Returns [] if the
// origin is unreachable, so the page never crashes.
export async function GET() {
  try {
    const items = await getRodongNews();
    return NextResponse.json({ source: "Rodong Sinmun", count: items.length, items });
  } catch {
    return NextResponse.json({ source: "Rodong Sinmun", count: 0, items: [] });
  }
}

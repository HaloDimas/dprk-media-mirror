import { NextResponse } from "next/server";
import { getNaenaraNews } from "@/lib/sources";

// Naenara — latest articles, fetched server-side over plain HTTP from the
// .kp origin (it does not work over HTTPS) with retries. Returns [] if the
// origin is unreachable, so the page never crashes.
export async function GET() {
  try {
    const items = await getNaenaraNews();
    return NextResponse.json({ source: "Naenara", count: items.length, items });
  } catch {
    return NextResponse.json({ source: "Naenara", count: 0, items: [] });
  }
}

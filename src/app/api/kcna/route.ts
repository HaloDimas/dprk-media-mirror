import { NextResponse } from "next/server";
import { getKcnaNews } from "@/lib/sources";

// KCNA — latest articles, fetched server-side over plain HTTP from the
// .kp origin (it does not work over HTTPS) with retries. Returns [] if the
// origin is unreachable, so the page never crashes.
export async function GET() {
  try {
    const items = await getKcnaNews();
    return NextResponse.json({ source: "KCNA", count: items.length, items });
  } catch {
    return NextResponse.json({ source: "KCNA", count: 0, items: [] });
  }
}

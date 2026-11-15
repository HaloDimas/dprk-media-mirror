import { NextResponse } from "next/server";
import { getMinjuNews } from "@/lib/sources";

// Minju Joson — latest articles, fetched server-side over plain HTTP from the
// .kp origin (it does not work over HTTPS) with retries. Returns [] if the
// origin is unreachable, so the page never crashes.
export async function GET() {
  try {
    const items = await getMinjuNews();
    return NextResponse.json({ source: "Minju Joson", count: items.length, items });
  } catch {
    return NextResponse.json({ source: "Minju Joson", count: 0, items: [] });
  }
}

import { NextResponse } from "next/server";
import { getStamps } from "@/lib/sources";

// Korean Stamp — latest new stamp issues (stock numbers, dates, PDF links),
// fetched server-side over plain HTTP from korstamp.com.kp.
export async function GET() {
  try {
    const items = await getStamps();
    return NextResponse.json({ source: "Korean Stamp", count: items.length, items });
  } catch {
    return NextResponse.json({ source: "Korean Stamp", count: 0, items: [] });
  }
}

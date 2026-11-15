import { NextResponse } from "next/server";
import { getRodongNews } from "@/lib/sources";

// Rodong Sinmun loads separately from the main news list because its server
// is the slowest of all sources. The news page fetches this route in the
// background after the fast sources (KCNA etc.) have rendered, so Rodong's
// articles appear when ready instead of holding up the whole page — and
// Rodong is never skipped. Long timeout: Rodong gets up to ~40s here.
export const maxDuration = 60;

export async function GET() {
  try {
    const items = await getRodongNews();
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

import { NextResponse } from "next/server";
import { getPeriodicals } from "@/lib/sources";


export async function GET() {
  try {
    const items = await getPeriodicals();
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Periodicals unavailable" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { getRecordings } from "@/lib/sources";


export async function GET() {
  try {
    const items = await getRecordings();
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Recordings unavailable" }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getEpg } from "@/lib/sources";
import type { ChannelId } from "@/lib/types";


export async function GET(request: NextRequest) {
  const channel = (request.nextUrl.searchParams.get("channel") || "kctv") as ChannelId;
  const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10);
  if (!["kctv", "sports", "ryongnamsan", "mansudae"].includes(channel)) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const data = await getEpg(channel, date);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Programme guide unavailable" }, { status: 502 });
  }
}

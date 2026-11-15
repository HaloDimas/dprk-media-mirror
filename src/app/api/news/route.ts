import { NextResponse } from "next/server";
import { getAllNews } from "@/lib/sources";


export async function GET() {
  try {
    const items = await getAllNews();
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "News unavailable" }, { status: 502 });
  }
}

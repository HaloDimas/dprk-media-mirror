import { NextResponse } from "next/server";
import { getPublications } from "@/lib/sources";


export async function GET() {
  try {
    const items = await getPublications();
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Publications unavailable" }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getArticle } from "@/lib/sources";


export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const article = await getArticle(id);
  if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });
  return NextResponse.json(article);
}

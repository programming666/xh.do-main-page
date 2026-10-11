import { NextResponse } from "next/server";

import { getHomePageData } from "@/lib/site-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "zh";
  const data = await getHomePageData(locale);
  return NextResponse.json(data);
}

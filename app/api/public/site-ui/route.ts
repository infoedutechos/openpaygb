import { NextResponse } from "next/server";
import { getPublicSiteUiSettings } from "@/lib/site-ui-settings";

export const revalidate = 60;

export async function GET() {
  const settings = await getPublicSiteUiSettings();
  return NextResponse.json(settings, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}

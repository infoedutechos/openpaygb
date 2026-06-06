import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { getPublicSiteUiSettings } from "@/lib/site-ui-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getPublicSiteUiSettings();
    return NextResponse.json(settings, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/public/site-ui",
      fallback: "Could not load site settings",
    });
  }
}

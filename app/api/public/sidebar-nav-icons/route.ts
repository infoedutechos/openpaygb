import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import { parseSidebarNavIconOverrides } from "@/lib/sidebar-nav-icon-overrides";
import { apiErrorResponse } from "@/lib/api-error";

/** Public map of navKey → iconId for dashboard sidebars. */
export async function GET() {
  try {
    const row = await prisma.siteUiSettings.findUnique({
      where: { key: PLATFORM_SITE_UI_KEY },
      select: { sidebarNavIconOverrides: true },
    });
    const overrides = parseSidebarNavIconOverrides(row?.sidebarNavIconOverrides);
    return NextResponse.json(
      { overrides },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (e) {
    // Field may be missing until db push — fail soft.
    if (String(e).includes("sidebarNavIconOverrides") || String(e).includes("Unknown field")) {
      return NextResponse.json({ overrides: {} });
    }
    return apiErrorResponse(e, { route: "GET /api/public/sidebar-nav-icons" });
  }
}

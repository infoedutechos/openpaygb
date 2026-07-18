import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { getPublicVisitStats } from "@/lib/site-visits";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getPublicVisitStats();
    if (!stats.showPublic) {
      return NextResponse.json(
        { showPublic: false, today: null, total: null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      {
        showPublic: true,
        today: stats.today,
        total: stats.total,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/public/visit-stats",
      fallback: "Could not load visit stats",
    });
  }
}

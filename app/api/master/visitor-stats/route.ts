import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";
import { getMasterVisitStats, setShowPublicVisitorStats } from "@/lib/site-visits";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;
    const stats = await getMasterVisitStats();
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/master/visitor-stats",
      fallback: "Could not load visitor analytics",
    });
  }
}

const PatchBody = z.object({
  showPublicVisitorStats: z.boolean(),
});

export async function PATCH(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;
    const json = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const showPublicVisitorStats = await setShowPublicVisitorStats(
      parsed.data.showPublicVisitorStats,
    );
    const stats = await getMasterVisitStats();
    return NextResponse.json({ ...stats, showPublicVisitorStats });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "PATCH /api/master/visitor-stats",
      fallback: "Could not update visitor settings",
    });
  }
}

import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { ensureAdminOpenPayHolder } from "@/lib/admin-openpay-holder";
import { ensurePendingOpenPayCard } from "@/lib/openpay-card";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST() {
  try {
    const session = await getAdminFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getOpenPayCardPlatformSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: "OpenPayGB card is not available" }, { status: 503 });
    }

    const holder = await ensureAdminOpenPayHolder(session.sub);
    const card = await ensurePendingOpenPayCard(holder.studentId, holder.organizationId);

    return NextResponse.json({
      card: {
        id: card.id,
        status: card.status,
        maskedPan: card.maskedPan,
        issueFeeTon: card.issueFeeTon ?? settings.issueFeeTon,
      },
      issueFeeTon: settings.issueFeeTon,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/openpay-card/opt-in" });
  }
}

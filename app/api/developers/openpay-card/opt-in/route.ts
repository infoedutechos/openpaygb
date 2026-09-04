import { NextResponse } from "next/server";
import { requireDeveloperOpenPayHolder } from "@/lib/developer-openpay-api";
import { ensurePendingOpenPayCard } from "@/lib/openpay-card";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST() {
  try {
    const gate = await requireDeveloperOpenPayHolder();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const settings = await getOpenPayCardPlatformSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: "OpenPayGB card is not available" }, { status: 503 });
    }

    const card = await ensurePendingOpenPayCard(gate.holder.studentId, gate.holder.organizationId);

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
    return apiErrorResponse(e, { route: "POST /api/developers/openpay-card/opt-in" });
  }
}

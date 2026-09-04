import { NextResponse } from "next/server";
import { requireDeveloperOpenPayHolder } from "@/lib/developer-openpay-api";
import { getStudentOpenPayCard, serializeOpenPayCardPublic } from "@/lib/openpay-card";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { openPayCardIssueFeeUgx } from "@/lib/openpay-card-issue-fee";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const gate = await requireDeveloperOpenPayHolder();
    const settings = await getOpenPayCardPlatformSettings();

    if (!gate.ok) {
      if (gate.status === 401) {
        return NextResponse.json({ error: gate.error }, { status: 401 });
      }
      return NextResponse.json({
        platform: { ...settings, issueFeeUgx: null },
        card: null,
        hasCard: false,
        canPayTuition: false,
        holderReady: false,
        holderError: gate.error,
      });
    }

    const { holder } = gate;
    const card = await getStudentOpenPayCard(holder.studentId);
    const issueFeeTon = card?.issueFeeTon ?? settings.issueFeeTon;
    const issueFee =
      card?.status === "pending_issue"
        ? await openPayCardIssueFeeUgx(issueFeeTon, holder.organizationId)
        : null;

    return NextResponse.json({
      platform: {
        ...settings,
        issueFeeUgx: issueFee?.amountUgx ?? null,
      },
      card: card ? serializeOpenPayCardPublic(card, holder) : null,
      hasCard: Boolean(card),
      canPayTuition: false,
      holderReady: true,
      holder: { name: holder.name, email: holder.email },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/developers/openpay-card" });
  }
}

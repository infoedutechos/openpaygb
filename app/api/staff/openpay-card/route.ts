import { NextResponse } from "next/server";
import { requireStaffOpenPayHolder } from "@/lib/staff-openpay-api";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { openPayCardIssueFeeUgx } from "@/lib/openpay-card-issue-fee";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const gate = await requireStaffOpenPayHolder();
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
      card: card
        ? {
            id: card.id,
            status: card.status,
            balanceUgx: card.balanceUgx,
            maskedPan: card.maskedPan,
            issuedAt: card.issuedAt?.toISOString() ?? null,
            issueFeeTon: card.issueFeeTon,
          }
        : null,
      hasCard: Boolean(card),
      canPayTuition: false,
      holderReady: true,
      holder: { name: holder.name, email: holder.email },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/staff/openpay-card" });
  }
}

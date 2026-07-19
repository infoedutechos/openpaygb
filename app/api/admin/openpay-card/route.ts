import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { ensureAdminOpenPayHolder } from "@/lib/admin-openpay-holder";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { openPayCardIssueFeeUgx } from "@/lib/openpay-card-issue-fee";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await getAdminFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getOpenPayCardPlatformSettings();
    let holder: Awaited<ReturnType<typeof ensureAdminOpenPayHolder>> | null = null;
    try {
      holder = await ensureAdminOpenPayHolder(session.sub);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not resolve card holder";
      return NextResponse.json({
        platform: { ...settings, issueFeeUgx: null },
        card: null,
        hasCard: false,
        canPayTuition: false,
        holderReady: false,
        holderError: msg,
      });
    }

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
    return apiErrorResponse(e, { route: "GET /api/admin/openpay-card" });
  }
}

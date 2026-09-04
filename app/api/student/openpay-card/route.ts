import { NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { getStudentOpenPayCard, serializeOpenPayCardPublic } from "@/lib/openpay-card";
import { openPayCardIssueFeeUgx } from "@/lib/openpay-card-issue-fee";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [settings, card, student] = await Promise.all([
      getOpenPayCardPlatformSettings(),
      getStudentOpenPayCard(session.sub),
      prisma.student.findUnique({
        where: { id: session.sub },
        select: { organizationId: true, name: true, email: true },
      }),
    ]);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const issueFeeTon = card?.issueFeeTon ?? settings.issueFeeTon;
    const issueFee =
      student.organizationId && card?.status === "pending_issue"
        ? await openPayCardIssueFeeUgx(issueFeeTon, student.organizationId)
        : null;

    return NextResponse.json({
      platform: {
        ...settings,
        issueFeeUgx: issueFee?.amountUgx ?? null,
      },
      card: card ? serializeOpenPayCardPublic(card, student) : null,
      hasCard: Boolean(card),
      canPayTuition: Boolean(card?.status === "active" && !card.blocked && card.balanceUgx > 0),
      holder: { name: student.name, email: student.email },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/student/openpay-card" });
  }
}

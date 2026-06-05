import { NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
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
        select: { organizationId: true },
      }),
    ]);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      platform: settings,
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
      canPayTuition: Boolean(card?.status === "active" && card.balanceUgx > 0),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/student/openpay-card" });
  }
}

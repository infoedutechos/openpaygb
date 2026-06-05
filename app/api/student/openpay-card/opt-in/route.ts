import { NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { ensurePendingOpenPayCard } from "@/lib/openpay-card";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST() {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getOpenPayCardPlatformSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: "OpenPayGB card is not available" }, { status: 503 });
    }

    const student = await prisma.student.findUnique({
      where: { id: session.sub },
      select: { organizationId: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const card = await ensurePendingOpenPayCard(session.sub, student.organizationId);

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
    return apiErrorResponse(e, { route: "POST /api/student/openpay-card/opt-in" });
  }
}

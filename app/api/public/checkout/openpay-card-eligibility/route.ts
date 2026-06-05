import { NextResponse } from "next/server";
import { assertCheckoutStudentAccess } from "@/lib/checkout-session";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";

/** Checkout-scoped: can this student pay tuition from an active OpenPayGB card? */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId")?.trim();
    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { organizationId: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const access = await assertCheckoutStudentAccess({
      req,
      studentId,
      organizationId: student.organizationId,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const settings = await getOpenPayCardPlatformSettings();
    if (!settings.enabled) {
      return NextResponse.json({
        enabled: false,
        hasCard: false,
        canPayTuition: false,
        balanceUgx: 0,
        maskedPan: null,
      });
    }

    const card = await getStudentOpenPayCard(studentId);
    return NextResponse.json({
      enabled: true,
      hasCard: Boolean(card),
      status: card?.status ?? null,
      balanceUgx: card?.balanceUgx ?? 0,
      maskedPan: card?.maskedPan ?? null,
      canPayTuition: Boolean(card?.status === "active"),
      issueFeeTon: card?.issueFeeTon ?? settings.issueFeeTon,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET checkout/openpay-card-eligibility" });
  }
}

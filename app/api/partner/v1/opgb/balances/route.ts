import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePartnerAuth } from "@/lib/partner-auth";

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePartnerAuth(req, "opgb:balance:read");
    if (!gate.ok) return gate.response;

    const studentId = req.nextUrl.searchParams.get("studentId")?.trim();
    if (!studentId) {
      return NextResponse.json({ error: "studentId query parameter required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, organizationId: true, name: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (gate.partner.organizationId && gate.partner.organizationId !== student.organizationId) {
      return NextResponse.json({ error: "Student outside key organization scope" }, { status: 403 });
    }

    const wallet = await prisma.opgbWallet.findUnique({
      where: { studentId: student.id },
      include: { assetBalances: true },
    });

    return NextResponse.json({
      studentId: student.id,
      studentName: student.name,
      opgb: {
        balanceUgx: wallet ? wallet.balanceMinor : 0,
        balanceMinor: wallet?.balanceMinor ?? 0,
        peg: "1 OPGB = 1 UGX",
      },
      assets: (wallet?.assetBalances ?? []).map((a) => ({
        asset: a.asset,
        amount: a.amount,
      })),
      partner: { keyId: gate.partner.keyId },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/partner/v1/opgb/balances" });
  }
}

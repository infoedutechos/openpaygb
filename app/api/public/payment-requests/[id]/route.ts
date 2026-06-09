import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActivePaymentRequest } from "@/lib/payment-request";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const row = await getActivePaymentRequest(id.trim());
    if (!row) return NextResponse.json({ error: "Request not found or expired" }, { status: 404 });

    const org = await prisma.organization.findUnique({
      where: { id: row.organizationId },
      select: { slug: true, name: true },
    });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    return NextResponse.json({
      request: {
        id: row.id,
        organizationSlug: org.slug,
        organizationName: org.name,
        studentId: row.studentId,
        amountUgx: row.amountUgx,
        memo: row.memo,
        programmeCode: row.programmeCode,
        year: row.year,
        semester: row.semester,
        feeSelectionMode: row.feeSelectionMode,
        expiresAt: row.expiresAt.toISOString(),
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/payment-requests/[id]" });
  }
}

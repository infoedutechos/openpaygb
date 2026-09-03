import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { getStudentFeeLedger } from "@/lib/school-fee-ledger";
import { loadSchoolOrgContext } from "@/lib/school-org-context";
import { isValidSchoolPayCode } from "@/lib/school-pay-code";

const Body = z.object({
  schoolPayCode: z.string().min(6).max(8),
  admissionNo: z.string().min(1).max(64),
});

/** Parent lookup: School Pay Code + admission number → fee ledger snapshot. */
export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "schoolPayCode and admissionNo required" }, { status: 400 });
    }
    const code = parsed.data.schoolPayCode.trim();
    if (!isValidSchoolPayCode(code)) {
      return NextResponse.json({ error: "Invalid school code" }, { status: 400 });
    }

    const org = await prisma.organization.findFirst({
      where: { schoolPayCode: code, tenantStatus: "active", institutionTier: "school" },
      select: { id: true, name: true, slug: true, activeSchoolTerm: true },
    });
    if (!org) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const admissionNo = parsed.data.admissionNo.trim();
    const student = await prisma.student.findFirst({
      where: { organizationId: org.id, admissionNo },
      select: { id: true, name: true, admissionNo: true },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const ctx = await loadSchoolOrgContext(org.id);
    const term = ctx?.activeTerm ?? org.activeSchoolTerm ?? 1;
    const ledger = await getStudentFeeLedger({
      organizationId: org.id,
      studentId: student.id,
      term,
      sessionId: ctx?.sessionId,
    });

    const payments = await prisma.payment.findMany({
      where: { studentId: student.id, organizationId: org.id, status: "confirmed" },
      orderBy: { confirmedAt: "desc" },
      take: 20,
      select: {
        id: true,
        totalUgx: true,
        confirmedAt: true,
        schoolReceiptNo: true,
        paymentMode: true,
        semester: true,
      },
    });

    return NextResponse.json({
      school: { name: org.name, slug: org.slug, schoolPayCode: code },
      student: { name: student.name, admissionNo: student.admissionNo },
      term,
      ledger,
      payments: payments.map((p) => ({
        id: p.id,
        totalUgx: p.totalUgx,
        confirmedAt: p.confirmedAt?.toISOString() ?? null,
        receiptNo: p.schoolReceiptNo || null,
        paymentMode: p.paymentMode || null,
        term: p.semester,
        receiptUrl: `/receipt/${p.id}`,
        pdfUrl: `/api/receipts/${p.id}/pdf`,
      })),
      payUrl: `/pay/${org.slug}`,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/public/parent/lookup" });
  }
}

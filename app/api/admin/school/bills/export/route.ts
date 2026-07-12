import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { csvResponse } from "@/lib/school-csv";
import { normalizeSchoolTerm } from "@/lib/school-term";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    const term = normalizeSchoolTerm(url.searchParams.get("term") ?? auth.context.activeTerm);
    const charges = await prisma.studentBillCharge.findMany({
      where: { organizationId: auth.scope.organizationId, term },
      include: {
        student: { select: { name: true, admissionNo: true } },
        schoolAccount: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const header = ["Name", "AdmissionNo", "Account", "Term", "AmountUgx", "Notes"];
    const dataRows = charges.map((c) => [
      c.student.name,
      c.student.admissionNo,
      c.schoolAccount.name,
      c.term,
      c.amountUgx,
      c.notes,
    ]);

    return csvResponse(`school-bills-term${term}-${new Date().toISOString().slice(0, 10)}.csv`, header, dataRows);
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/bills/export" });
  }
}

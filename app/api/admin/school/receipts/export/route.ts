import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { csvResponse } from "@/lib/school-csv";
import { listSchoolReceipts } from "@/lib/school-receipts";
import { normalizeSchoolTerm } from "@/lib/school-term";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    const termParam = url.searchParams.get("term");
    const term = termParam ? normalizeSchoolTerm(termParam) : undefined;
    const schoolClassId = url.searchParams.get("schoolClassId")?.trim() || undefined;
    const receipts = await listSchoolReceipts({
      organizationId: auth.scope.organizationId,
      term,
      schoolClassId,
    });

    const header = ["ReceiptNo", "Date", "StudentName", "Class", "Term", "PaymentMode", "TotalUgx", "Rail"];
    const rows = receipts.map((r) => [
      r.receiptNo,
      r.date,
      r.studentName,
      r.classCode ?? "",
      r.termLabel,
      r.paymentMode,
      r.totalUgx,
      r.rail,
    ]);

    return csvResponse("school-receipts.csv", header, rows);
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/receipts/export" });
  }
}

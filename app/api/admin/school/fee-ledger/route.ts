import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { listStudentFeeLedgers, getStudentFeeLedger } from "@/lib/school-fee-ledger";
import { normalizeSchoolTerm } from "@/lib/school-term";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const term = normalizeSchoolTerm(url.searchParams.get("term") ?? auth.context.activeTerm);
    const studentId = url.searchParams.get("studentId");
    const schoolClassId = url.searchParams.get("classId") || undefined;
    const q = url.searchParams.get("q") || undefined;

    if (studentId) {
      const row = await getStudentFeeLedger({
        organizationId: auth.scope.organizationId,
        studentId,
        term,
        sessionId: auth.context.sessionId,
      });
      if (!row) return NextResponse.json({ error: "Student ledger not found" }, { status: 404 });
      return NextResponse.json({ row });
    }

    const { rows, totals } = await listStudentFeeLedgers({
      organizationId: auth.scope.organizationId,
      term,
      sessionId: auth.context.sessionId,
      schoolClassId,
      q,
    });

    return NextResponse.json({
      term,
      termLabel: auth.context.sessionLabel,
      rows,
      totals,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/fee-ledger" });
  }
}

import { NextResponse } from "next/server";
import {
  buildBillAccountReport,
  buildCashFlowReport,
  buildClassBillsSummary,
  buildExpenseAccountReport,
  buildInventoryAccountReport,
  buildPayrollReport,
  buildProfitLossReport,
  buildStudentAccountStatement,
} from "@/lib/school-reports";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { parseSchoolReportDateRange } from "@/lib/school-report-period";
import { normalizeSchoolTerm } from "@/lib/school-term";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const report = url.searchParams.get("report");
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const termParam = url.searchParams.get("term");
    const term = termParam ? normalizeSchoolTerm(termParam) : undefined;
    const period = parseSchoolReportDateRange(
      url.searchParams.get("from"),
      url.searchParams.get("to"),
    );
    if (period.error) return NextResponse.json({ error: period.error }, { status: 400 });

    if (report === "cash-flow") {
      const data = await buildCashFlowReport({
        organizationId: auth.scope.organizationId,
        term,
        from: period.from,
        to: period.to,
        sessionId: auth.context.sessionId,
      });
      return NextResponse.json(data);
    }

    if (report === "profit-loss") {
      const data = await buildProfitLossReport({
        organizationId: auth.scope.organizationId,
        term,
        from: period.from,
        to: period.to,
        sessionId: auth.context.sessionId,
      });
      return NextResponse.json(data);
    }

    if (report === "class-bills") {
      const classId = url.searchParams.get("classId");
      if (!classId || !term) return NextResponse.json({ error: "classId and term required" }, { status: 400 });
      const data = await buildClassBillsSummary({
        organizationId: auth.scope.organizationId,
        classId,
        term,
        sessionId: auth.context.sessionId,
      });
      return NextResponse.json(data);
    }

    if (report === "student-account") {
      const studentId = url.searchParams.get("studentId");
      if (!studentId || !term) return NextResponse.json({ error: "studentId and term required" }, { status: 400 });
      const data = await buildStudentAccountStatement({
        organizationId: auth.scope.organizationId,
        studentId,
        term,
      });
      return NextResponse.json(data);
    }

    if (report === "payroll") {
      const monthKey = url.searchParams.get("monthKey") ?? undefined;
      const data = await buildPayrollReport({ organizationId: auth.scope.organizationId, monthKey });
      return NextResponse.json(data);
    }

    if (report === "bill-account") {
      if (!term) return NextResponse.json({ error: "term required" }, { status: 400 });
      const schoolAccountId = url.searchParams.get("schoolAccountId") ?? undefined;
      const data = await buildBillAccountReport({
        organizationId: auth.scope.organizationId,
        term,
        schoolAccountId,
      });
      return NextResponse.json(data);
    }

    if (report === "expense-account") {
      const accountId = url.searchParams.get("accountId") ?? undefined;
      const data = await buildExpenseAccountReport({
        organizationId: auth.scope.organizationId,
        term,
        accountId,
        from: period.from,
        to: period.to,
        sessionId: auth.context.sessionId,
      });
      return NextResponse.json(data);
    }

    if (report === "inventory-account") {
      const data = await buildInventoryAccountReport({ organizationId: auth.scope.organizationId });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unknown report" }, { status: 400 });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/reports" });
  }
}

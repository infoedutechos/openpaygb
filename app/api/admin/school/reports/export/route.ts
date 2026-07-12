import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { csvResponse } from "@/lib/school-csv";
import { buildSchoolReportPdf } from "@/lib/school-report-pdf";
import { normalizeSchoolTerm } from "@/lib/school-term";
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const report = url.searchParams.get("report");
    const format = url.searchParams.get("format") ?? "csv";
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    const termParam = url.searchParams.get("term");
    const term = termParam ? normalizeSchoolTerm(termParam) : undefined;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    let rows: (string | number)[][] = [];
    let header: string[] = [];
    const filename = `school-report-${report ?? "unknown"}`;

    if (report === "cash-flow") {
      const data = await buildCashFlowReport({
        organizationId: auth.scope.organizationId,
        term,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      });
      header = ["Direction", "Date", "TrackId", "Name", "Particulars", "AmountUgx"];
      rows = [
        ...data.inflow.map((l) => ["INFLOW", l.date, l.trackId, l.name, l.particulars, l.amountUgx]),
        ...data.outflow.map((l) => ["OUTFLOW", l.date, l.trackId, l.name, l.particulars, l.amountUgx]),
      ];
    } else if (report === "profit-loss") {
      const data = await buildProfitLossReport({ organizationId: auth.scope.organizationId, term });
      header = ["Metric", "ValueUgx"];
      rows = [
        ["Income", data.incomeUgx],
        ["Expenditure", data.expenditureUgx],
        ["Net", data.netUgx],
        ["InventoryUnits", data.inventoryValueUgx],
      ];
    } else if (report === "class-bills" && term) {
      const classId = url.searchParams.get("classId");
      if (!classId) return Response.json({ error: "classId required" }, { status: 400 });
      const data = await buildClassBillsSummary({ organizationId: auth.scope.organizationId, classId, term });
      header = ["StudentName", "ExpectedUgx", "PaidUgx", "BalanceUgx"];
      rows = data.rows.map((r) => [r.studentName, r.expectedUgx, r.paidUgx, r.balanceUgx]);
    } else if (report === "student-account" && term) {
      const studentId = url.searchParams.get("studentId");
      if (!studentId) return Response.json({ error: "studentId required" }, { status: 400 });
      const data = await buildStudentAccountStatement({ organizationId: auth.scope.organizationId, studentId, term });
      header = ["Type", "Label", "AmountUgx", "Date"];
      rows = [
        ...data.charges.map((c) => ["CHARGE", c.accountName, c.amountUgx, ""]),
        ...data.payments.map((p) => ["PAYMENT", p.receiptNo, p.amountUgx, p.date]),
        ["BALANCE", "Outstanding", data.balanceUgx, ""],
      ];
    } else if (report === "payroll") {
      const data = await buildPayrollReport({
        organizationId: auth.scope.organizationId,
        monthKey: url.searchParams.get("monthKey") ?? undefined,
      });
      header = ["StaffCode", "Name", "GrossUgx", "DeductionUgx", "NetUgx", "PaidAt"];
      rows = data.rows.map((r) => [r.staffCode, r.name, r.grossUgx, r.deductionUgx, r.netUgx, r.paidAt ?? ""]);
    } else if (report === "bill-account" && term) {
      const schoolAccountId = url.searchParams.get("schoolAccountId") ?? undefined;
      const data = await buildBillAccountReport({ organizationId: auth.scope.organizationId, term, schoolAccountId });
      header = ["AccountName", "StudentCount", "TotalUgx"];
      rows = data.rows.map((r) => [r.accountName, r.studentCount, r.totalUgx]);
    } else if (report === "expense-account") {
      const accountId = url.searchParams.get("accountId") ?? undefined;
      const data = await buildExpenseAccountReport({ organizationId: auth.scope.organizationId, term, accountId });
      header = ["AccountName", "VoucherCount", "TotalUgx"];
      rows = data.rows.map((r) => [r.accountName, r.voucherCount, r.totalUgx]);
    } else if (report === "inventory-account") {
      const data = await buildInventoryAccountReport({ organizationId: auth.scope.organizationId });
      header = ["Name", "AvailableQty", "UnavailableQty", "Notes"];
      rows = data.rows.map((r) => [r.name, r.availableQty, r.unavailableQty, r.notes]);
    } else {
      return Response.json({ error: "Unknown report" }, { status: 400 });
    }

    if (format === "csv") {
      return csvResponse(`${filename}.csv`, header, rows);
    }

    if (format === "pdf") {
      const pdfBytes = await buildSchoolReportPdf({
        title: `School report — ${report}`,
        subtitle: term ? `Term ${term}` : auth.context.sessionLabel,
        headers: header,
        rows,
      });
      return new Response(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      });
    }

    return Response.json({ header, rows });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/reports/export" });
  }
}

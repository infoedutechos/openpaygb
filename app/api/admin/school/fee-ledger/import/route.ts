import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { csvResponse } from "@/lib/school-csv";
import {
  FEE_LEDGER_CSV_TEMPLATE_HEADERS,
  importFeeLedgerRows,
  parseFeeLedgerCsv,
} from "@/lib/school-fee-ledger-import";
import { normalizeSchoolTerm } from "@/lib/school-term";

/** Download CSV template matching the Uwais spreadsheet columns. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    return csvResponse("fee-ledger-import-template.csv", [...FEE_LEDGER_CSV_TEMPLATE_HEADERS], [
      ["1", "Hamiim Matovu", "P4", "JUN – AUG", "600000", "691000", "691000", "76000", "524000", ""],
      ["2", "Abubakar Umar", "P4", "JUN – AUG", "500000", "---", "---", "170000", "330000", "Nxt wk"],
      ["3", "Aswim Dauda", "P5", "JUN – AUG", "500000", "---", "---", "500000", "CLEARED", ""],
    ]);
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/fee-ledger/import" });
  }
}

/** Import spreadsheet-style fee ledger CSV (students + bills + opening payments). */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const auth = await requireSchoolAdminScope(String(form.get("organizationSlug") ?? "") || undefined);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file required" }, { status: 400 });
    }

    const fallbackTerm = normalizeSchoolTerm(
      String(form.get("term") ?? auth.context.activeTerm ?? 2),
    );
    const skipExistingPayments = form.get("skipExistingPayments") !== "false";

    const text = await file.text();
    const rows = parseFeeLedgerCsv(text, fallbackTerm);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No student rows found in CSV" }, { status: 400 });
    }

    const result = await importFeeLedgerRows({
      organizationId: auth.scope.organizationId,
      rows,
      skipExistingPayments,
    });

    return NextResponse.json({ ...result, importedRows: rows.length });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/fee-ledger/import" });
  }
}

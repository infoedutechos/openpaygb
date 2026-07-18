import { apiErrorResponse } from "@/lib/api-error";

import { requireSchoolAdminScope } from "@/lib/school-admin-api";

import { csvResponse } from "@/lib/school-csv";

import { listSchoolDefaulters } from "@/lib/school-defaulters";

import { buildSchoolReportPdf } from "@/lib/school-report-pdf";

import { normalizeSchoolTerm } from "@/lib/school-term";



export async function GET(req: Request) {

  try {

    const url = new URL(req.url);

    const format = url.searchParams.get("format") ?? "csv";

    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));

    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });



    const term = normalizeSchoolTerm(url.searchParams.get("term") ?? auth.context.activeTerm);

    const tab = url.searchParams.get("tab") ?? undefined;

    const schoolClassId = url.searchParams.get("schoolClassId")?.trim() || undefined;

    const { rows } = await listSchoolDefaulters({

      organizationId: auth.scope.organizationId,

      term,

      tab: tab as Parameters<typeof listSchoolDefaulters>[0]["tab"],

      sessionId: auth.context.sessionId,

      schoolClassId,

    });



    const header = ["Name", "AdmissionNo", "Class", "DebtBalanceUgx", "LastPaymentDate", "LastReceiptNo", "Tab"];

    const dataRows = rows.map((r) => [

      r.name,

      r.admissionNo,

      r.classCode ?? "",

      r.debtBalanceUgx,

      r.lastPaymentDate ?? "",

      r.lastReceiptNo ?? "",

      r.tab,

    ]);



    if (format === "pdf") {

      const pdfBytes = await buildSchoolReportPdf({

        title: "Defaulters report",

        subtitle: `Term ${term}${tab ? ` — ${tab}` : ""}`,

        headers: header,

        rows: dataRows,

      });

      return new Response(Buffer.from(pdfBytes), {

        headers: {

          "Content-Type": "application/pdf",

          "Content-Disposition": `attachment; filename="school-defaulters-term${term}.pdf"`,

        },

      });

    }



    return csvResponse(`school-defaulters-term${term}.csv`, header, dataRows);

  } catch (e) {

    return apiErrorResponse(e, { route: "GET /api/admin/school/defaulters/export" });

  }

}

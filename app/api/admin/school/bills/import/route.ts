import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { csvCell, mapCsvHeaders, parseCsv } from "@/lib/school-csv";
import { normalizeSchoolTerm } from "@/lib/school-term";

export async function POST(req: Request) {
  try {
    const auth = await requireSchoolAdminScope();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const form = await req.formData();
    const file = form.get("file");
    const term = normalizeSchoolTerm(String(form.get("term") ?? auth.context.activeTerm));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file required" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) return NextResponse.json({ error: "Empty CSV" }, { status: 400 });

    const headers = mapCsvHeaders(rows[0] ?? []);
    let created = 0;

    for (const row of rows.slice(1)) {
      const admissionNo = csvCell(row, headers, "admissionno") || csvCell(row, headers, "admission no");
      const studentName = csvCell(row, headers, "name");
      const accountName = csvCell(row, headers, "account") || csvCell(row, headers, "feehead");
      const amountRaw = csvCell(row, headers, "amountugx") || csvCell(row, headers, "amount");
      const amountUgx = parseInt(amountRaw.replace(/[^\d]/g, ""), 10);
      if (!accountName || !Number.isFinite(amountUgx) || amountUgx <= 0) continue;

      const student = await prisma.student.findFirst({
        where: {
          organizationId: auth.scope.organizationId,
          OR: [
            ...(admissionNo ? [{ admissionNo }] : []),
            ...(studentName ? [{ name: studentName }] : []),
          ],
        },
        select: { id: true },
      });
      if (!student) continue;

      const account = await prisma.schoolAccount.findFirst({
        where: { organizationId: auth.scope.organizationId, name: accountName, kind: "income" },
      });
      if (!account) continue;

      const existing = await prisma.studentBillCharge.findFirst({
        where: {
          organizationId: auth.scope.organizationId,
          studentId: student.id,
          schoolAccountId: account.id,
          term,
        },
      });
      if (existing) {
        await prisma.studentBillCharge.update({
          where: { id: existing.id },
          data: { amountUgx },
        });
      } else {
        await prisma.studentBillCharge.create({
          data: {
            organizationId: auth.scope.organizationId,
            studentId: student.id,
            schoolAccountId: account.id,
            sessionId: auth.context.sessionId,
            term,
            amountUgx,
          },
        });
      }
      created++;
    }

    return NextResponse.json({ created });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/bills/import" });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { ensureFeeLedgerAccounts, FEE_LEDGER_EXTRA_INCOME_ACCOUNTS, FEE_LEDGER_TUITION_ACCOUNT } from "@/lib/school-fee-ledger-accounts";
import { normalizeSchoolTerm } from "@/lib/school-term";

const AdjustBody = z.object({
  organizationSlug: z.string().optional(),
  studentId: z.string().min(1),
  term: z.number().int().min(1).max(3),
  amountUgx: z.number().int().min(0),
  kind: z.enum(["discount", "scholarship", "waiver"]),
  note: z.string().max(200).optional(),
  schoolAccountId: z.string().optional(),
});

/** Apply discount / scholarship / waiver to a student's term tuition (or chosen income head). */
export async function POST(req: Request) {
  try {
    const body = AdjustBody.parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const term = normalizeSchoolTerm(body.term);
    await ensureFeeLedgerAccounts(auth.scope.organizationId);

    let accountId = body.schoolAccountId;
    if (!accountId) {
      const tuition = await prisma.schoolAccount.findFirst({
        where: {
          organizationId: auth.scope.organizationId,
          name: FEE_LEDGER_TUITION_ACCOUNT,
          kind: "income",
        },
        select: { id: true },
      });
      accountId = tuition?.id;
    }
    if (!accountId) {
      return NextResponse.json({ error: "Tuition account not found" }, { status: 404 });
    }

    const charge = await prisma.studentBillCharge.findFirst({
      where: {
        organizationId: auth.scope.organizationId,
        studentId: body.studentId,
        schoolAccountId: accountId,
        term,
      },
    });
    if (!charge) {
      return NextResponse.json({ error: "No bill charge found for this student/term — assign fees first" }, { status: 404 });
    }

    const discountUgx = Math.min(body.amountUgx, charge.amountUgx);
    const updated = await prisma.studentBillCharge.update({
      where: { id: charge.id },
      data: {
        discountUgx,
        adjustmentKind: body.kind,
        adjustmentNote: body.note?.trim() ?? "",
      },
    });

    return NextResponse.json({
      chargeId: updated.id,
      discountUgx: updated.discountUgx,
      adjustmentKind: updated.adjustmentKind,
      netUgx: Math.max(0, updated.amountUgx - updated.discountUgx),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/fee-adjustments" });
  }
}

/** List available fee heads for structure UI. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await ensureFeeLedgerAccounts(auth.scope.organizationId);
    const accounts = await prisma.schoolAccount.findMany({
      where: { organizationId: auth.scope.organizationId, kind: "income", enabled: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, sortOrder: true, defaultAmountUgx: true },
    });

    const recommended = [FEE_LEDGER_TUITION_ACCOUNT, ...FEE_LEDGER_EXTRA_INCOME_ACCOUNTS];

    return NextResponse.json({ accounts, recommended });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/fee-adjustments" });
  }
}

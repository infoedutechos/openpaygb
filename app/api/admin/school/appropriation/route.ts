import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { normalizeSchoolTerm } from "@/lib/school-term";

const UpsertBody = z.object({
  organizationSlug: z.string().optional(),
  term: z.number().int().min(1).max(3),
  expenditureAccountId: z.string().min(1),
  percentOfIncome: z.number().min(0).max(100),
  minBalanceUgx: z.number().int().min(0).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const organizationSlug = url.searchParams.get("organizationSlug") ?? undefined;
    const term = normalizeSchoolTerm(url.searchParams.get("term") ?? authTermFallback());
    const auth = await requireSchoolAdminScope(organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const rows = await prisma.schoolFundsAppropriation.findMany({
      where: { organizationId: auth.scope.organizationId, term },
      include: { expenditureAccount: { select: { id: true, name: true } } },
      orderBy: { percentOfIncome: "desc" },
    });

    const appropriated = rows.reduce((s, r) => s + r.percentOfIncome, 0);
    return NextResponse.json({
      term,
      rows: rows.map((r) => ({
        id: r.id,
        expenditureAccountId: r.expenditureAccountId,
        accountName: r.expenditureAccount.name,
        percentOfIncome: r.percentOfIncome,
        minBalanceUgx: r.minBalanceUgx,
      })),
      appropriatedPercent: appropriated,
      unappropriatedPercent: Math.max(0, 100 - appropriated),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/appropriation" });
  }
}

function authTermFallback(): number {
  return 1;
}

export async function POST(req: Request) {
  try {
    const body = UpsertBody.parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const term = normalizeSchoolTerm(body.term);
    const account = await prisma.schoolAccount.findFirst({
      where: { id: body.expenditureAccountId, organizationId: auth.scope.organizationId, kind: "expenditure" },
    });
    if (!account) return NextResponse.json({ error: "Expenditure account not found" }, { status: 404 });

    const existing = await prisma.schoolFundsAppropriation.findMany({
      where: { organizationId: auth.scope.organizationId, term },
    });
    const otherPercent = existing
      .filter((r) => r.expenditureAccountId !== body.expenditureAccountId)
      .reduce((s, r) => s + r.percentOfIncome, 0);
    if (otherPercent + body.percentOfIncome > 100) {
      return NextResponse.json(
        { error: `Appropriation would exceed 100% (${otherPercent + body.percentOfIncome}%)` },
        { status: 400 },
      );
    }

    const row = await prisma.schoolFundsAppropriation.upsert({
      where: {
        organizationId_term_expenditureAccountId: {
          organizationId: auth.scope.organizationId,
          term,
          expenditureAccountId: body.expenditureAccountId,
        },
      },
      create: {
        organizationId: auth.scope.organizationId,
        term,
        expenditureAccountId: body.expenditureAccountId,
        percentOfIncome: body.percentOfIncome,
        minBalanceUgx: body.minBalanceUgx ?? 0,
      },
      update: {
        percentOfIncome: body.percentOfIncome,
        minBalanceUgx: body.minBalanceUgx ?? 0,
      },
    });

    const totalPercent = otherPercent + body.percentOfIncome;

    return NextResponse.json({ id: row.id, appropriatedPercent: totalPercent });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/appropriation" });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const auth = await requireSchoolAdminScope();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await prisma.schoolFundsAppropriation.deleteMany({
      where: { id, organizationId: auth.scope.organizationId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/admin/school/appropriation" });
  }
}

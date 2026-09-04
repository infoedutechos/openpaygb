import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";

function orgSlug(req: NextRequest) {
  return req.nextUrl.searchParams.get("organizationSlug");
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requireSchoolAdminScope(orgSlug(req));
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const term = Number(req.nextUrl.searchParams.get("term") || gate.context.activeTerm || 1);
    const deposits = await prisma.schoolCashbookDeposit.findMany({
      where: { organizationId: gate.scope.organizationId, term },
      orderBy: { depositedAt: "desc" },
      take: 100,
    });
    const totalUgx = deposits.reduce((s, d) => s + d.amountUgx, 0);

    return NextResponse.json({
      term,
      totalDepositedUgx: totalUgx,
      deposits: deposits.map((d) => ({
        id: d.id,
        amountUgx: d.amountUgx,
        method: d.method,
        reference: d.reference,
        note: d.note,
        depositedAt: d.depositedAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/cashbook-deposits" });
  }
}

const Body = z.object({
  amountUgx: z.number().int().positive(),
  method: z.enum(["bank", "cash", "momo", "other"]).optional(),
  reference: z.string().max(120).optional(),
  note: z.string().max(300).optional(),
  term: z.number().int().min(1).max(3).optional(),
  depositedAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const gate = await requireSchoolAdminScope(orgSlug(req));
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const row = await prisma.schoolCashbookDeposit.create({
      data: {
        organizationId: gate.scope.organizationId,
        term: parsed.data.term ?? gate.context.activeTerm ?? 1,
        amountUgx: parsed.data.amountUgx,
        method: parsed.data.method ?? "bank",
        reference: parsed.data.reference?.trim() ?? "",
        note: parsed.data.note?.trim() ?? "",
        depositedAt: parsed.data.depositedAt ? new Date(parsed.data.depositedAt) : new Date(),
      },
    });

    return NextResponse.json(
      {
        deposit: {
          id: row.id,
          amountUgx: row.amountUgx,
          method: row.method,
          reference: row.reference,
          note: row.note,
          depositedAt: row.depositedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/cashbook-deposits" });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { findSalaryExpenditureAccount } from "@/lib/school-salary-account";
import { getExpenditureAvailableFund } from "@/lib/school-account-balance";
import { normalizeSchoolTerm } from "@/lib/school-term";

const VoucherBody = z.object({
  organizationSlug: z.string().optional(),
  term: z.number().int().min(1).max(3),
  accountId: z.string().min(1),
  payee: z.string().min(1),
  payer: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(z.object({ particular: z.string(), amountUgx: z.number().int().min(0) })).min(1),
});

const SalaryBody = z.object({
  organizationSlug: z.string().optional(),
  staffId: z.string().min(1),
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  grossUgx: z.number().int().min(0),
  deductionUgx: z.number().int().min(0).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") ?? "vouchers";
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (kind === "salary") {
      const payments = await prisma.schoolSalaryPayment.findMany({
        where: { organizationId: auth.scope.organizationId },
        include: { staff: { select: { staffCode: true, name: true } } },
        orderBy: { monthKey: "desc" },
        take: 100,
      });
      return NextResponse.json({
        salaryPayments: payments.map((p) => ({
          id: p.id,
          staffCode: p.staff.staffCode,
          staffName: p.staff.name,
          monthKey: p.monthKey,
          grossUgx: p.grossUgx,
          deductionUgx: p.deductionUgx,
          netUgx: p.netUgx,
          paidAt: p.paidAt?.toISOString() ?? null,
        })),
      });
    }

    const vouchers = await prisma.schoolOutflowVoucher.findMany({
      where: { organizationId: auth.scope.organizationId },
      include: { account: { select: { name: true } } },
      orderBy: { disbursedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      vouchers: vouchers.map((v) => ({
        id: v.id,
        term: v.term,
        accountName: v.account.name,
        payee: v.payee,
        payer: v.payer,
        totalUgx: v.totalUgx,
        disbursedAt: v.disbursedAt.toISOString(),
        lineItems: v.lineItems,
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/outflow" });
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") ?? "voucher";

    if (kind === "salary") {
      const body = SalaryBody.parse(await req.json());
      const authSalary = await requireSchoolAdminScope(body.organizationSlug);
      if (!authSalary.ok) return NextResponse.json({ error: authSalary.error }, { status: authSalary.status });

      const staff = await prisma.schoolStaff.findFirst({
        where: { id: body.staffId, organizationId: authSalary.scope.organizationId, status: "active" },
      });
      if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

      const deductionUgx = body.deductionUgx ?? 0;
      const netUgx = Math.max(0, body.grossUgx - deductionUgx);
      const term = authSalary.context.activeTerm;
      const salaryAccount = await findSalaryExpenditureAccount(authSalary.scope.organizationId);
      if (salaryAccount) {
        const availableUgx = await getExpenditureAvailableFund({
          organizationId: authSalary.scope.organizationId,
          term,
          accountId: salaryAccount.id,
        });
        if (netUgx > availableUgx) {
          return NextResponse.json(
            { error: `Insufficient salary appropriation (available ${availableUgx.toLocaleString()} UGX)` },
            { status: 400 },
          );
        }
      }

      const payment = await prisma.schoolSalaryPayment.upsert({
        where: { staffId_monthKey: { staffId: body.staffId, monthKey: body.monthKey } },
        create: {
          organizationId: authSalary.scope.organizationId,
          staffId: body.staffId,
          monthKey: body.monthKey,
          grossUgx: body.grossUgx,
          deductionUgx,
          netUgx,
          paidAt: new Date(),
        },
        update: { grossUgx: body.grossUgx, deductionUgx, netUgx, paidAt: new Date() },
      });
      return NextResponse.json({ id: payment.id, netUgx });
    }

    const body = VoucherBody.parse(await req.json());
    const authVoucher = await requireSchoolAdminScope(body.organizationSlug);
    if (!authVoucher.ok) return NextResponse.json({ error: authVoucher.error }, { status: authVoucher.status });

    const account = await prisma.schoolAccount.findFirst({
      where: { id: body.accountId, organizationId: authVoucher.scope.organizationId, kind: "expenditure" },
    });
    if (!account) return NextResponse.json({ error: "Expenditure account not found" }, { status: 404 });

    const term = normalizeSchoolTerm(body.term);
    const totalUgx = body.lineItems.reduce((s, l) => s + l.amountUgx, 0);
    const availableUgx = await getExpenditureAvailableFund({
      organizationId: authVoucher.scope.organizationId,
      term,
      accountId: body.accountId,
    });
    if (totalUgx > availableUgx) {
      return NextResponse.json(
        { error: `Insufficient appropriated funds (available ${availableUgx.toLocaleString()} UGX)` },
        { status: 400 },
      );
    }

    const voucher = await prisma.schoolOutflowVoucher.create({
      data: {
        organizationId: authVoucher.scope.organizationId,
        term,
        accountId: body.accountId,
        payee: body.payee.trim(),
        payer: body.payer?.trim() ?? "",
        notes: body.notes?.trim() ?? "",
        lineItems: body.lineItems,
        totalUgx,
      },
    });

    return NextResponse.json({ id: voucher.id, totalUgx });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/outflow" });
  }
}

import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { findSalaryExpenditureAccount } from "@/lib/school-salary-account";

export type CashFlowLine = {
  date: string;
  trackId: string;
  name: string;
  particulars: string;
  amountUgx: number;
  direction: "inflow" | "outflow";
};

export async function buildCashFlowReport(input: {
  organizationId: string;
  term?: number;
  from?: Date;
  to?: Date;
}): Promise<{ inflow: CashFlowLine[]; outflow: CashFlowLine[]; totals: { inflowUgx: number; outflowUgx: number } }> {
  const term = input.term ? normalizeSchoolTerm(input.term) : undefined;
  const dateFilter =
    input.from || input.to
      ? {
          ...(input.from ? { gte: input.from } : {}),
          ...(input.to ? { lte: input.to } : {}),
        }
      : undefined;

  const payments = await prisma.payment.findMany({
    where: {
      organizationId: input.organizationId,
      status: PaymentStatus.confirmed,
      ...(term ? { semester: term } : {}),
      ...(dateFilter ? { confirmedAt: dateFilter } : {}),
    },
    include: { student: { select: { name: true } } },
    orderBy: { confirmedAt: "asc" },
  });

  const vouchers = await prisma.schoolOutflowVoucher.findMany({
    where: {
      organizationId: input.organizationId,
      ...(term ? { term } : {}),
      ...(dateFilter ? { disbursedAt: dateFilter } : {}),
    },
    include: { account: { select: { name: true } } },
    orderBy: { disbursedAt: "asc" },
  });

  const salaryPayments = await prisma.schoolSalaryPayment.findMany({
    where: {
      organizationId: input.organizationId,
      paidAt: { not: null },
      ...(dateFilter ? { paidAt: dateFilter } : {}),
    },
    include: { staff: { select: { name: true, staffCode: true } } },
    orderBy: { paidAt: "asc" },
  });

  const inflow: CashFlowLine[] = payments.map((p) => ({
    date: (p.confirmedAt ?? p.createdAt).toISOString().slice(0, 10),
    trackId: p.id.slice(-8).toUpperCase(),
    name: p.student.name,
    particulars: `Tuition payment (${p.programmeCode})`,
    amountUgx: p.totalUgx,
    direction: "inflow",
  }));

  const outflow: CashFlowLine[] = [
    ...vouchers.flatMap((v) => {
    const items = Array.isArray(v.lineItems) ? (v.lineItems as { particular?: string; amountUgx?: number }[]) : [];
    if (items.length === 0) {
      return [
        {
          date: v.disbursedAt.toISOString().slice(0, 10),
          trackId: v.id.slice(-8).toUpperCase(),
          name: v.payee,
          particulars: v.account.name,
          amountUgx: v.totalUgx,
          direction: "outflow" as const,
        },
      ];
    }
    return items.map((line) => ({
      date: v.disbursedAt.toISOString().slice(0, 10),
      trackId: v.id.slice(-8).toUpperCase(),
      name: v.payee,
      particulars: line.particular ?? v.account.name,
      amountUgx: line.amountUgx ?? 0,
      direction: "outflow" as const,
    }));
  }),
    ...salaryPayments.map((s) => ({
      date: (s.paidAt ?? s.createdAt).toISOString().slice(0, 10),
      trackId: s.id.slice(-8).toUpperCase(),
      name: s.staff.name,
      particulars: `Salary ${s.monthKey} (${s.staff.staffCode})`,
      amountUgx: s.netUgx,
      direction: "outflow" as const,
    })),
  ];

  const inflowUgx = inflow.reduce((s, l) => s + l.amountUgx, 0);
  const outflowUgx = outflow.reduce((s, l) => s + l.amountUgx, 0);

  return { inflow, outflow, totals: { inflowUgx, outflowUgx } };
}

export async function buildClassBillsSummary(input: {
  organizationId: string;
  classId: string;
  term: number;
}): Promise<{ rows: { studentName: string; expectedUgx: number; paidUgx: number; balanceUgx: number }[] }> {
  const term = normalizeSchoolTerm(input.term);
  const students = await prisma.student.findMany({
    where: { organizationId: input.organizationId, schoolClassId: input.classId },
    include: {
      billCharges: { where: { term } },
      payments: { where: { status: PaymentStatus.confirmed, semester: term } },
    },
  });

  const rows = students.map((s) => {
    const expectedUgx = s.billCharges.reduce((sum, b) => sum + b.amountUgx, 0);
    const paidUgx = s.payments.reduce((sum, p) => sum + p.totalUgx, 0);
    return {
      studentName: s.name,
      expectedUgx,
      paidUgx,
      balanceUgx: Math.max(0, expectedUgx - paidUgx),
    };
  });

  return { rows };
}

export async function buildStudentAccountStatement(input: {
  organizationId: string;
  studentId: string;
  term: number;
}): Promise<{
  studentName: string;
  charges: { accountName: string; amountUgx: number }[];
  payments: { date: string; amountUgx: number; receiptNo: string }[];
  balanceUgx: number;
}> {
  const term = normalizeSchoolTerm(input.term);
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, organizationId: input.organizationId },
    include: {
      billCharges: {
        where: { term },
        include: { schoolAccount: { select: { name: true } } },
      },
      payments: {
        where: { status: PaymentStatus.confirmed, semester: term },
        orderBy: { confirmedAt: "asc" },
      },
    },
  });
  if (!student) throw new Error("Student not found");

  const charges = student.billCharges.map((c) => ({
    accountName: c.schoolAccount.name,
    amountUgx: c.amountUgx,
  }));
  const payments = student.payments.map((p) => ({
    date: (p.confirmedAt ?? p.createdAt).toISOString().slice(0, 10),
    amountUgx: p.totalUgx,
    receiptNo: p.schoolReceiptNo || p.id.slice(-8).toUpperCase(),
  }));
  const expected = charges.reduce((s, c) => s + c.amountUgx, 0);
  const paid = payments.reduce((s, p) => s + p.amountUgx, 0);

  return {
    studentName: student.name,
    charges,
    payments,
    balanceUgx: Math.max(0, expected - paid),
  };
}

export async function buildProfitLossReport(input: {
  organizationId: string;
  term?: number;
}): Promise<{ incomeUgx: number; expenditureUgx: number; netUgx: number; inventoryValueUgx: number }> {
  const term = input.term ? normalizeSchoolTerm(input.term) : undefined;
  const cash = await buildCashFlowReport({ organizationId: input.organizationId, term });
  const inventory = await prisma.schoolInventoryItem.aggregate({
    where: { organizationId: input.organizationId },
    _sum: { availableQty: true },
  });
  return {
    incomeUgx: cash.totals.inflowUgx,
    expenditureUgx: cash.totals.outflowUgx,
    netUgx: cash.totals.inflowUgx - cash.totals.outflowUgx,
    inventoryValueUgx: inventory._sum.availableQty ?? 0,
  };
}

export async function buildPayrollReport(input: {
  organizationId: string;
  monthKey?: string;
}): Promise<{
  rows: { staffCode: string; name: string; grossUgx: number; deductionUgx: number; netUgx: number; paidAt: string | null }[];
  totals: { grossUgx: number; netUgx: number };
}> {
  const staff = await prisma.schoolStaff.findMany({
    where: { organizationId: input.organizationId, status: "active" },
    include: {
      salaryPayments: input.monthKey ? { where: { monthKey: input.monthKey } } : true,
    },
    orderBy: { name: "asc" },
  });

  const rows = staff.map((s) => {
    const payment = s.salaryPayments[0];
    const grossUgx = payment?.grossUgx ?? s.salaryUgx;
    const deductionUgx = payment?.deductionUgx ?? 0;
    const netUgx = payment?.netUgx ?? Math.max(0, grossUgx - deductionUgx);
    return {
      staffCode: s.staffCode,
      name: s.name,
      grossUgx,
      deductionUgx,
      netUgx,
      paidAt: payment?.paidAt?.toISOString().slice(0, 10) ?? null,
    };
  });

  return {
    rows,
    totals: {
      grossUgx: rows.reduce((s, r) => s + r.grossUgx, 0),
      netUgx: rows.reduce((s, r) => s + r.netUgx, 0),
    },
  };
}

export async function buildBillAccountReport(input: {
  organizationId: string;
  term: number;
  schoolAccountId?: string;
}): Promise<{ rows: { accountName: string; studentCount: number; totalUgx: number }[] }> {
  const term = normalizeSchoolTerm(input.term);
  const charges = await prisma.studentBillCharge.findMany({
    where: {
      organizationId: input.organizationId,
      term,
      ...(input.schoolAccountId ? { schoolAccountId: input.schoolAccountId } : {}),
    },
    include: { schoolAccount: { select: { name: true } } },
  });

  const byAccount = new Map<string, { accountName: string; studentIds: Set<string>; totalUgx: number }>();
  for (const c of charges) {
    const key = c.schoolAccountId;
    const row = byAccount.get(key) ?? {
      accountName: c.schoolAccount.name,
      studentIds: new Set<string>(),
      totalUgx: 0,
    };
    row.studentIds.add(c.studentId);
    row.totalUgx += c.amountUgx;
    byAccount.set(key, row);
  }

  return {
    rows: [...byAccount.values()].map((r) => ({
      accountName: r.accountName,
      studentCount: r.studentIds.size,
      totalUgx: r.totalUgx,
    })),
  };
}

export async function buildExpenseAccountReport(input: {
  organizationId: string;
  term?: number;
  accountId?: string;
}): Promise<{ rows: { accountName: string; voucherCount: number; totalUgx: number }[] }> {
  const term = input.term ? normalizeSchoolTerm(input.term) : undefined;
  const [vouchers, salaryAccount, salaryRows] = await Promise.all([
    prisma.schoolOutflowVoucher.findMany({
      where: {
        organizationId: input.organizationId,
        ...(term ? { term } : {}),
        ...(input.accountId ? { accountId: input.accountId } : {}),
      },
      include: { account: { select: { name: true } } },
    }),
    findSalaryExpenditureAccount(input.organizationId),
    prisma.schoolSalaryPayment.findMany({
      where: { organizationId: input.organizationId, paidAt: { not: null } },
    }),
  ]);

  const byAccount = new Map<string, { accountName: string; voucherCount: number; totalUgx: number }>();
  for (const v of vouchers) {
    const key = v.accountId;
    const row = byAccount.get(key) ?? { accountName: v.account.name, voucherCount: 0, totalUgx: 0 };
    row.voucherCount += 1;
    row.totalUgx += v.totalUgx;
    byAccount.set(key, row);
  }

  if (salaryAccount && (!input.accountId || input.accountId === salaryAccount.id)) {
    const salaryTotal = salaryRows.reduce((s, r) => s + r.netUgx, 0);
    if (salaryTotal > 0) {
      const row = byAccount.get(salaryAccount.id) ?? {
        accountName: salaryAccount.name,
        voucherCount: 0,
        totalUgx: 0,
      };
      row.voucherCount += salaryRows.length;
      row.totalUgx += salaryTotal;
      byAccount.set(salaryAccount.id, row);
    }
  }

  return { rows: [...byAccount.values()] };
}

export async function buildInventoryAccountReport(input: {
  organizationId: string;
}): Promise<{ rows: { name: string; availableQty: number; unavailableQty: number; notes: string }[] }> {
  const items = await prisma.schoolInventoryItem.findMany({
    where: { organizationId: input.organizationId },
    orderBy: { name: "asc" },
  });
  return {
    rows: items.map((i) => ({
      name: i.name,
      availableQty: i.availableQty,
      unavailableQty: i.unavailableQty,
      notes: i.notes,
    })),
  };
}

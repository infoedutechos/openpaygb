import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { findSalaryExpenditureAccount } from "@/lib/school-salary-account";
import { getStudentTermPaidUgx, getStudentTermOutstanding } from "@/lib/school-account-balance";
import { schoolReportDateFilter } from "@/lib/school-report-period";
import { schoolSessionWhere } from "@/lib/school-session-scope";

export type CashFlowLine = {
  date: string;
  trackId: string;
  name: string;
  particulars: string;
  amountUgx: number;
  direction: "inflow" | "outflow";
};

export function calculateInventoryTotals(
  items: { availableQty: number; unavailableQty: number; unitCostUgx: number }[],
): { availableQty: number; unavailableQty: number; availableValueUgx: number } {
  return items.reduce(
    (totals, item) => ({
      availableQty: totals.availableQty + item.availableQty,
      unavailableQty: totals.unavailableQty + item.unavailableQty,
      availableValueUgx: totals.availableValueUgx + item.availableQty * item.unitCostUgx,
    }),
    { availableQty: 0, unavailableQty: 0, availableValueUgx: 0 },
  );
}

export async function buildCashFlowReport(input: {
  organizationId: string;
  term?: number;
  from?: Date;
  to?: Date;
  sessionId?: string | null;
}): Promise<{ inflow: CashFlowLine[]; outflow: CashFlowLine[]; totals: { inflowUgx: number; outflowUgx: number } }> {
  const term = input.term ? normalizeSchoolTerm(input.term) : undefined;
  const dateFilter = schoolReportDateFilter(input.from, input.to);

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

  const cashbook = await prisma.schoolCashbookDeposit.findMany({
    where: {
      organizationId: input.organizationId,
      ...(term ? { term } : {}),
      ...(dateFilter ? { depositedAt: dateFilter } : {}),
    },
    orderBy: { depositedAt: "asc" },
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
      ...(term ? { OR: [{ term }, { term: null }] } : {}),
      ...(input.sessionId
        ? { AND: [{ OR: [{ schoolSessionId: input.sessionId }, { schoolSessionId: null }] }] }
        : {}),
      ...(dateFilter ? { paidAt: dateFilter } : {}),
    },
    include: { staff: { select: { name: true, staffCode: true } } },
    orderBy: { paidAt: "asc" },
  });

  const inflow: CashFlowLine[] = [
    ...payments.map((p) => ({
      date: (p.confirmedAt ?? p.createdAt).toISOString().slice(0, 10),
      trackId: p.id.slice(-8).toUpperCase(),
      name: p.student.name,
      particulars: `Tuition payment (${p.programmeCode})`,
      amountUgx: p.totalUgx,
      direction: "inflow" as const,
    })),
    ...cashbook.map((d) => ({
      date: d.depositedAt.toISOString().slice(0, 10),
      trackId: d.id.slice(-8).toUpperCase(),
      name: d.method || "Cashbook",
      particulars: d.note?.trim()
        ? `Cashbook deposit — ${d.note.trim()}${d.reference ? ` (${d.reference})` : ""}`
        : `Cashbook deposit${d.reference ? ` (${d.reference})` : ""}`,
      amountUgx: d.amountUgx,
      direction: "inflow" as const,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

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
  sessionId?: string | null;
}): Promise<{ rows: { studentName: string; expectedUgx: number; paidUgx: number; balanceUgx: number }[] }> {
  const term = normalizeSchoolTerm(input.term);
  const students = await prisma.student.findMany({
    where: {
      organizationId: input.organizationId,
      schoolClassId: input.classId,
      ...schoolSessionWhere(input.sessionId),
    },
    include: {
      billCharges: { where: { term } },
    },
  });

  const rows = await Promise.all(
    students.map(async (s) => {
      const expectedUgx = s.billCharges.reduce((sum, b) => sum + b.amountUgx, 0);
      const paidUgx = await getStudentTermPaidUgx({
        organizationId: input.organizationId,
        studentId: s.id,
        term,
      });
      return {
        studentName: s.name,
        expectedUgx,
        paidUgx,
        balanceUgx: Math.max(0, expectedUgx - paidUgx),
      };
    }),
  );

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
  const balanceUgx = await getStudentTermOutstanding({
    organizationId: input.organizationId,
    studentId: student.id,
    term,
  });

  return {
    studentName: student.name,
    charges,
    payments,
    balanceUgx,
  };
}

export async function buildProfitLossReport(input: {
  organizationId: string;
  term?: number;
  from?: Date;
  to?: Date;
  sessionId?: string | null;
}): Promise<{
  incomeUgx: number;
  expenditureUgx: number;
  netUgx: number;
  inventoryUnits: number;
  inventoryValueUgx: number;
}> {
  const term = input.term ? normalizeSchoolTerm(input.term) : undefined;
  const cash = await buildCashFlowReport({
    organizationId: input.organizationId,
    term,
    from: input.from,
    to: input.to,
    sessionId: input.sessionId,
  });
  const inventory = await prisma.schoolInventoryItem.findMany({
    where: { organizationId: input.organizationId },
    select: { availableQty: true, unavailableQty: true, unitCostUgx: true },
  });
  const inventoryTotals = calculateInventoryTotals(inventory);
  return {
    incomeUgx: cash.totals.inflowUgx,
    expenditureUgx: cash.totals.outflowUgx,
    netUgx: cash.totals.inflowUgx - cash.totals.outflowUgx,
    inventoryUnits: inventoryTotals.availableQty,
    inventoryValueUgx: inventoryTotals.availableValueUgx,
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
  from?: Date;
  to?: Date;
  sessionId?: string | null;
}): Promise<{ rows: { accountName: string; voucherCount: number; totalUgx: number }[] }> {
  const term = input.term ? normalizeSchoolTerm(input.term) : undefined;
  const dateFilter = schoolReportDateFilter(input.from, input.to);
  const [vouchers, salaryAccount, salaryRows] = await Promise.all([
    prisma.schoolOutflowVoucher.findMany({
      where: {
        organizationId: input.organizationId,
        ...(term ? { term } : {}),
        ...(input.accountId ? { accountId: input.accountId } : {}),
        ...(dateFilter ? { disbursedAt: dateFilter } : {}),
      },
      include: { account: { select: { name: true } } },
    }),
    findSalaryExpenditureAccount(input.organizationId),
    prisma.schoolSalaryPayment.findMany({
      where: {
        organizationId: input.organizationId,
        paidAt: dateFilter ?? { not: null },
        ...(term ? { OR: [{ term }, { term: null }] } : {}),
        ...(input.sessionId
          ? { AND: [{ OR: [{ schoolSessionId: input.sessionId }, { schoolSessionId: null }] }] }
          : {}),
      },
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
}): Promise<{
  rows: {
    name: string;
    availableQty: number;
    unavailableQty: number;
    unitCostUgx: number;
    availableValueUgx: number;
    notes: string;
  }[];
  totals: { availableQty: number; unavailableQty: number; availableValueUgx: number };
}> {
  const items = await prisma.schoolInventoryItem.findMany({
    where: { organizationId: input.organizationId },
    orderBy: { name: "asc" },
  });
  const totals = calculateInventoryTotals(items);
  return {
    rows: items.map((i) => ({
      name: i.name,
      availableQty: i.availableQty,
      unavailableQty: i.unavailableQty,
      unitCostUgx: i.unitCostUgx,
      availableValueUgx: i.availableQty * i.unitCostUgx,
      notes: i.notes,
    })),
    totals,
  };
}

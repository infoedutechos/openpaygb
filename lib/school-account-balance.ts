import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { findSalaryExpenditureAccount } from "@/lib/school-salary-account";
import { getAllocatedPaidUgx } from "@/lib/school-payment-allocation";

/** Available fund per expenditure account = appropriated share of term income − outflows − salary (SALARY account). */
export async function getExpenditureAccountBalances(input: {
  organizationId: string;
  term: number;
}): Promise<{
  accountId: string;
  accountName: string;
  appropriatedUgx: number;
  spentUgx: number;
  minBalanceUgx: number;
  availableUgx: number;
}[]> {
  const term = normalizeSchoolTerm(input.term);

  const [incomeTotal, appropriations, vouchers, expenditureAccounts, salaryAccount, salaryPaid] = await Promise.all([
    prisma.payment.aggregate({
      where: { organizationId: input.organizationId, status: PaymentStatus.confirmed, semester: term },
      _sum: { totalUgx: true },
    }),
    prisma.schoolFundsAppropriation.findMany({
      where: { organizationId: input.organizationId, term },
      include: { expenditureAccount: { select: { id: true, name: true } } },
    }),
    prisma.schoolOutflowVoucher.findMany({
      where: { organizationId: input.organizationId, term },
      select: { accountId: true, totalUgx: true },
    }),
    prisma.schoolAccount.findMany({
      where: { organizationId: input.organizationId, kind: "expenditure" },
      select: { id: true, name: true },
    }),
    findSalaryExpenditureAccount(input.organizationId),
    prisma.schoolSalaryPayment.aggregate({
      where: { organizationId: input.organizationId, paidAt: { not: null } },
      _sum: { netUgx: true },
    }),
  ]);

  const incomeUgx = incomeTotal._sum.totalUgx ?? 0;
  const spentByAccount = new Map<string, number>();
  for (const v of vouchers) {
    spentByAccount.set(v.accountId, (spentByAccount.get(v.accountId) ?? 0) + v.totalUgx);
  }
  if (salaryAccount) {
    spentByAccount.set(
      salaryAccount.id,
      (spentByAccount.get(salaryAccount.id) ?? 0) + (salaryPaid._sum.netUgx ?? 0),
    );
  }

  const appropriationByAccount = new Map<string, { name: string; percent: number; minBalanceUgx: number }>();
  for (const row of appropriations) {
    appropriationByAccount.set(row.expenditureAccountId, {
      name: row.expenditureAccount.name,
      percent: row.percentOfIncome,
      minBalanceUgx: row.minBalanceUgx,
    });
  }

  return expenditureAccounts.map((acc) => {
    const rule = appropriationByAccount.get(acc.id);
    const appropriatedUgx = rule ? Math.round((rule.percent / 100) * incomeUgx) : 0;
    const spentUgx = spentByAccount.get(acc.id) ?? 0;
    const minBalanceUgx = rule?.minBalanceUgx ?? 0;
    const rawAvailable = appropriatedUgx - spentUgx - minBalanceUgx;
    return {
      accountId: acc.id,
      accountName: acc.name,
      appropriatedUgx,
      spentUgx,
      minBalanceUgx,
      availableUgx: Math.max(0, rawAvailable),
    };
  });
}

export async function getExpenditureAvailableFund(input: {
  organizationId: string;
  term: number;
  accountId: string;
}): Promise<number> {
  const rows = await getExpenditureAccountBalances(input);
  return rows.find((r) => r.accountId === input.accountId)?.availableUgx ?? 0;
}

export async function getStudentTermOutstanding(input: {
  organizationId: string;
  studentId: string;
  term: number;
}): Promise<number> {
  const term = normalizeSchoolTerm(input.term);
  const charges = await prisma.studentBillCharge.aggregate({
    where: { organizationId: input.organizationId, studentId: input.studentId, term },
    _sum: { amountUgx: true },
  });
  const expected = charges._sum.amountUgx ?? 0;
  if (expected <= 0) return 0;

  const allocatedPaid = await getAllocatedPaidUgx(input);
  if (allocatedPaid > 0) return Math.max(0, expected - allocatedPaid);

  const paid = await prisma.payment.aggregate({
    where: {
      organizationId: input.organizationId,
      studentId: input.studentId,
      semester: term,
      status: PaymentStatus.confirmed,
    },
    _sum: { totalUgx: true },
  });
  return Math.max(0, expected - (paid._sum.totalUgx ?? 0));
}

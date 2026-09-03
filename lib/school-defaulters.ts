import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { listStudentFeeLedgers } from "@/lib/school-fee-ledger";
import { schoolSessionWhere } from "@/lib/school-session-scope";

export type DefaulterTab = "all_due" | "overdue" | "responding" | "non_defaulters";

export type DefaulterRow = {
  studentId: string;
  name: string;
  admissionNo: string;
  classCode: string | null;
  className: string | null;
  debtBalanceUgx: number;
  lastPaymentDate: string | null;
  lastReceiptNo: string | null;
  tab: DefaulterTab;
};

const OVERDUE_DAYS = 10;

function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Defaulters use the same outstanding formula as the student fee ledger
 * (fee required − discounts + previous balance − payments).
 */
export async function listSchoolDefaulters(input: {
  organizationId: string;
  term: number;
  tab?: DefaulterTab;
  sessionId?: string | null;
  schoolClassId?: string;
}): Promise<{ rows: DefaulterRow[]; groups: { classCode: string; count: number; totalDebtUgx: number }[] }> {
  const term = normalizeSchoolTerm(input.term);
  const { rows: ledgerRows } = await listStudentFeeLedgers({
    organizationId: input.organizationId,
    term,
    sessionId: input.sessionId,
    schoolClassId: input.schoolClassId,
  });

  const paymentMeta = await prisma.student.findMany({
    where: {
      organizationId: input.organizationId,
      id: { in: ledgerRows.map((r) => r.studentId) },
      ...schoolSessionWhere(input.sessionId),
    },
    select: {
      id: true,
      payments: {
        where: { status: PaymentStatus.confirmed, semester: term },
        orderBy: { confirmedAt: "desc" },
        take: 1,
        select: { confirmedAt: true, schoolReceiptNo: true, id: true },
      },
    },
  });
  const payByStudent = new Map(paymentMeta.map((s) => [s.id, s.payments[0] ?? null]));

  const rows: DefaulterRow[] = [];

  for (const ledger of ledgerRows) {
    const debt = ledger.totalOutstandingUgx;
    const lastPay = payByStudent.get(ledger.studentId);
    const lastAt = lastPay?.confirmedAt ?? null;
    const days = daysSince(lastAt);
    const paid = ledger.previousBalancePaidUgx + ledger.currentTermPaidUgx;
    const hasPartial = paid > 0 && debt > 0;

    let tab: DefaulterTab = "non_defaulters";
    if (debt > 0) {
      tab = "all_due";
      if (hasPartial && days !== null && days <= OVERDUE_DAYS) tab = "responding";
      else if (days === null || days > OVERDUE_DAYS) tab = "overdue";
    }

    if (input.tab && input.tab !== tab) continue;

    rows.push({
      studentId: ledger.studentId,
      name: ledger.studentName,
      admissionNo: ledger.admissionNo || ledger.studentName,
      classCode: ledger.classCode,
      className: ledger.className,
      debtBalanceUgx: debt,
      lastPaymentDate: lastAt ? lastAt.toISOString().slice(0, 10) : null,
      lastReceiptNo: lastPay?.schoolReceiptNo || ledger.latestReceiptNo || null,
      tab,
    });
  }

  const groupMap = new Map<string, { count: number; totalDebtUgx: number }>();
  for (const r of rows) {
    if (r.debtBalanceUgx <= 0) continue;
    const key = r.classCode ?? "UNASSIGNED";
    const g = groupMap.get(key) ?? { count: 0, totalDebtUgx: 0 };
    g.count += 1;
    g.totalDebtUgx += r.debtBalanceUgx;
    groupMap.set(key, g);
  }

  const groups = [...groupMap.entries()].map(([classCode, v]) => ({
    classCode,
    count: v.count,
    totalDebtUgx: v.totalDebtUgx,
  }));

  return { rows, groups };
}

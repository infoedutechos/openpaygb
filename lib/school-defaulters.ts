import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { getStudentBalanceSummary } from "@/lib/tuition-balance";
import { getStudentTermPaidUgx } from "@/lib/school-account-balance";
import { billChargeSessionWhere, schoolSessionWhere } from "@/lib/school-session-scope";

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

function receiptLabel(paymentId: string, index: number): string {
  return `RP-${index + 1}`;
}

export async function listSchoolDefaulters(input: {
  organizationId: string;
  term: number;
  tab?: DefaulterTab;
  sessionId?: string | null;
  schoolClassId?: string;
}): Promise<{ rows: DefaulterRow[]; groups: { classCode: string; count: number; totalDebtUgx: number }[] }> {
  const term = normalizeSchoolTerm(input.term);
  const students = await prisma.student.findMany({
    where: {
      organizationId: input.organizationId,
      ...schoolSessionWhere(input.sessionId),
      ...(input.schoolClassId ? { schoolClassId: input.schoolClassId } : {}),
    },
    include: {
      schoolClass: { select: { code: true, name: true } },
      payments: {
        where: { status: PaymentStatus.confirmed, semester: term },
        orderBy: { confirmedAt: "desc" },
        select: { id: true, confirmedAt: true, semester: true, totalUgx: true, schoolReceiptNo: true },
      },
      billCharges: {
        where: { term, ...billChargeSessionWhere(input.sessionId) },
        select: { amountUgx: true },
      },
    },
  });

  const rows: DefaulterRow[] = [];

  for (const s of students) {
    let expectedUgx = s.billCharges.reduce((sum, b) => sum + b.amountUgx, 0);
    let paidUgx = 0;

    if (expectedUgx <= 0) {
      try {
        const balance = await getStudentBalanceSummary({
          studentId: s.id,
          organizationId: input.organizationId,
          programmeCode: s.programmeCode,
          year: s.year,
          semester: term,
        });
        const ctx = balance?.contexts.find((c) => c.semester === term) ?? balance?.contexts[0];
        if (ctx) {
          expectedUgx = ctx.expectedSubtotalUgx;
          paidUgx = ctx.confirmedPaidSubtotalUgx;
        }
      } catch {
        // student may lack programme — skip tuition inference
      }
    } else {
      paidUgx = await getStudentTermPaidUgx({
        organizationId: input.organizationId,
        studentId: s.id,
        term,
      });
    }
    const debt = Math.max(0, expectedUgx - paidUgx);
    const lastPay = s.payments[0]?.confirmedAt ?? null;
    const days = daysSince(lastPay);
    const hasPartial = paidUgx > 0 && debt > 0;

    let tab: DefaulterTab = "non_defaulters";
    if (debt > 0) {
      tab = "all_due";
      if (hasPartial && days !== null && days <= OVERDUE_DAYS) tab = "responding";
      else if (days === null || days > OVERDUE_DAYS) tab = "overdue";
    }

    if (input.tab && input.tab !== tab) continue;

    rows.push({
      studentId: s.id,
      name: s.name,
      admissionNo: s.admissionNo || s.programmeCode,
      classCode: s.schoolClass?.code ?? null,
      className: s.schoolClass?.name ?? null,
      debtBalanceUgx: debt,
      lastPaymentDate: lastPay ? lastPay.toISOString().slice(0, 10) : null,
      lastReceiptNo: s.payments[0]
        ? s.payments[0].schoolReceiptNo || receiptLabel(s.payments[0].id, 0)
        : null,
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

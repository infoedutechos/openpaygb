import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCheckoutPlatformFeeUgxForOrganization } from "@/lib/checkout-platform-fee";
import { buildInstallmentSchedule, type InstallmentCountOption, type InstallmentSlice } from "@/lib/installments";
import { feeTotal } from "@/lib/money";
import {
  findProgrammeByCode,
  resolveFeeRowsForSelection,
  sumFeeRows,
  type ProgrammeFeeSelectionMode,
} from "@/lib/programmes";
import { buildStudentProgrammeProgress, type StudentProgrammeProgress } from "@/lib/tuition-progress";

export type PaymentBalanceRow = {
  id: string;
  status: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode: string;
  includedFeeIds: string[];
  tuitionUgx: number;
  functionalFeesUgx: number;
  totalUgx: number;
  platformFeeUgx: number;
  installmentCount: number;
  installmentIndex: number;
  installmentPlanId: string | null;
  installmentScheduleSubtotalUgx: number | null;
  createdAt: Date;
  confirmedAt: Date | null;
};

export type InstallmentSliceStatus = "paid" | "pending" | "due" | "upcoming";

export type InstallmentPlanBalance = {
  installmentPlanId: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode: ProgrammeFeeSelectionMode;
  includedFeeIds: string[];
  installmentCount: InstallmentCountOption;
  scheduleSubtotalUgx: number;
  platformFeePerInstallmentUgx: number;
  fullPlanTotalUgx: number;
  paidTotalUgx: number;
  paidSubtotalUgx: number;
  remainingTotalUgx: number;
  slices: Array<
    InstallmentSlice & {
      status: InstallmentSliceStatus;
      paymentId?: string;
      paymentStatus?: string;
    }
  >;
  nextDueIndex: number | null;
  isComplete: boolean;
};

export type ContextBalance = {
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode: ProgrammeFeeSelectionMode;
  expectedSubtotalUgx: number;
  expectedPlatformFeeUgx: number;
  expectedFullPayTotalUgx: number;
  confirmedPaidSubtotalUgx: number;
  confirmedPaidTotalUgx: number;
  remainingSubtotalUgx: number;
  remainingFullPayTotalUgx: number;
  isFullyPaid: boolean;
  includedFeeIds: string[];
};

export type StudentBalanceSummary = {
  studentId: string;
  organizationId: string;
  installmentPlans: InstallmentPlanBalance[];
  contexts: ContextBalance[];
  progress: StudentProgrammeProgress | null;
};

/** Canonical key for matching payments to the same fee obligation. */
export function obligationFingerprint(opts: {
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode: string;
  includedFeeIds: string[];
}): string {
  const code = opts.programmeCode.trim().toUpperCase();
  const mode = opts.feeSelectionMode === "year" ? "year" : "semester";
  const ids = [...opts.includedFeeIds].filter(Boolean).sort().join(",");
  return `${code}|${opts.year}|${opts.semester}|${mode}|${ids}`;
}

export function normalizeIncludedFeeIds(ids: string[] | null | undefined): string[] {
  return [...new Set((ids ?? []).filter(Boolean))].sort();
}

export function paymentFingerprint(p: PaymentBalanceRow): string {
  return obligationFingerprint({
    programmeCode: p.programmeCode,
    year: p.year,
    semester: p.semester,
    feeSelectionMode: p.feeSelectionMode,
    includedFeeIds: normalizeIncludedFeeIds(p.includedFeeIds),
  });
}

/** Pending pay-in-full for the same fee obligation (blocks duplicate checkout until settled). */
export function hasPendingFullPaymentForFingerprint(
  payments: PaymentBalanceRow[],
  fp: string,
): boolean {
  return payments.some(
    (p) =>
      p.status === PaymentStatus.pending &&
      (p.installmentCount ?? 1) <= 1 &&
      paymentFingerprint(p) === fp,
  );
}

export function mapPaymentRow(p: {
  id: string;
  status: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode: string;
  includedFeeIds: string[];
  tuitionUgx: number;
  functionalFeesUgx: number;
  totalUgx: number;
  platformFeeUgx: number;
  installmentCount: number;
  installmentIndex: number;
  installmentPlanId: string | null;
  installmentScheduleSubtotalUgx: number | null;
  createdAt: Date;
  confirmedAt: Date | null;
}): PaymentBalanceRow {
  return {
    id: p.id,
    status: p.status,
    programmeCode: p.programmeCode,
    year: p.year,
    semester: p.semester,
    feeSelectionMode: p.feeSelectionMode,
    includedFeeIds: p.includedFeeIds ?? [],
    tuitionUgx: p.tuitionUgx,
    functionalFeesUgx: p.functionalFeesUgx,
    totalUgx: p.totalUgx,
    platformFeeUgx: p.platformFeeUgx ?? 0,
    installmentCount: p.installmentCount ?? 1,
    installmentIndex: p.installmentIndex ?? 1,
    installmentPlanId: p.installmentPlanId,
    installmentScheduleSubtotalUgx: p.installmentScheduleSubtotalUgx,
    createdAt: p.createdAt,
    confirmedAt: p.confirmedAt,
  };
}

export async function quoteObligation(opts: {
  organizationId: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode: ProgrammeFeeSelectionMode;
  feeIds?: string[] | null;
}): Promise<{
  includedFeeIds: string[];
  tuitionUgx: number;
  functionalFeesUgx: number;
  subtotalUgx: number;
  platformFeeUgx: number;
  installmentCount: InstallmentCountOption;
  fullPlanTotalUgx: number;
  slices: InstallmentSlice[];
} | null> {
  const p = await findProgrammeByCode(opts.programmeCode, opts.organizationId);
  if (!p) return null;

  let rows;
  try {
    const resolved = resolveFeeRowsForSelection(p.fees, {
      mode: opts.feeSelectionMode,
      year: opts.year,
      semester: opts.semester,
      selectedIds: opts.feeIds?.length ? opts.feeIds : undefined,
    });
    rows = resolved.rows;
  } catch {
    return null;
  }

  const { tuitionUgx, functionalFeesUgx } = sumFeeRows(rows);
  if (tuitionUgx === 0 && functionalFeesUgx === 0) return null;

  const subtotalUgx = feeTotal(tuitionUgx, functionalFeesUgx);
  const platformFeeUgx = await getCheckoutPlatformFeeUgxForOrganization(opts.organizationId);
  const schedule = buildInstallmentSchedule(subtotalUgx, platformFeeUgx, 1);

  return {
    includedFeeIds: rows.map((r) => r.id),
    tuitionUgx,
    functionalFeesUgx,
    subtotalUgx,
    platformFeeUgx,
    installmentCount: 1,
    fullPlanTotalUgx: schedule.fullPlanTotalUgx,
    slices: schedule.slices,
  };
}

export function buildInstallmentPlanBalance(
  planId: string,
  payments: PaymentBalanceRow[],
): InstallmentPlanBalance | null {
  const planPayments = payments
    .filter((p) => (p.installmentPlanId ?? p.id) === planId || p.id === planId)
    .sort((a, b) => a.installmentIndex - b.installmentIndex);

  if (planPayments.length === 0) return null;

  const anchor = planPayments[0];
  const count = Math.max(1, anchor.installmentCount) as InstallmentCountOption;
  if (count === 1) return null;

  const scheduleSubtotal =
    anchor.installmentScheduleSubtotalUgx ??
    planPayments.reduce((s, p) => s + p.tuitionUgx + p.functionalFeesUgx, 0);

  const platformFeePer = anchor.platformFeeUgx || planPayments[0]?.platformFeeUgx || 0;
  const schedule = buildInstallmentSchedule(scheduleSubtotal, platformFeePer, count);

  const byIndex = new Map<number, PaymentBalanceRow>();
  for (const p of planPayments) {
    byIndex.set(p.installmentIndex, p);
  }

  let paidSubtotal = 0;
  let paidTotal = 0;
  const slices = schedule.slices.map((slice) => {
    const pay = byIndex.get(slice.index);
    const subPaid = pay ? pay.tuitionUgx + pay.functionalFeesUgx : 0;
    if (pay?.status === PaymentStatus.confirmed) {
      paidSubtotal += subPaid;
      paidTotal += pay.totalUgx;
    }
    let status: InstallmentSliceStatus = "upcoming";
    if (pay?.status === PaymentStatus.confirmed) status = "paid";
    else if (pay?.status === PaymentStatus.pending) status = "pending";
    else if (slice.index === 1 || (byIndex.get(slice.index - 1)?.status === PaymentStatus.confirmed)) {
      status = "due";
    }
    return {
      ...slice,
      status,
      paymentId: pay?.id,
      paymentStatus: pay?.status,
    };
  });

  const nextDue = slices.find((s) => s.status === "due" || s.status === "pending");
  const isComplete = slices.every((s) => s.status === "paid");

  return {
    installmentPlanId: planId,
    programmeCode: anchor.programmeCode,
    year: anchor.year,
    semester: anchor.semester,
    feeSelectionMode: anchor.feeSelectionMode === "year" ? "year" : "semester",
    includedFeeIds: normalizeIncludedFeeIds(anchor.includedFeeIds),
    installmentCount: count,
    scheduleSubtotalUgx: scheduleSubtotal,
    platformFeePerInstallmentUgx: platformFeePer,
    fullPlanTotalUgx: schedule.fullPlanTotalUgx,
    paidTotalUgx: paidTotal,
    paidSubtotalUgx: paidSubtotal,
    remainingTotalUgx: Math.max(0, schedule.fullPlanTotalUgx - paidTotal),
    slices,
    nextDueIndex: isComplete ? null : (nextDue?.index ?? null),
    isComplete,
  };
}

function sumConfirmedForFingerprint(payments: PaymentBalanceRow[], fp: string): {
  subtotalUgx: number;
  totalUgx: number;
} {
  let subtotalUgx = 0;
  let totalUgx = 0;
  for (const p of payments) {
    if (p.status !== PaymentStatus.confirmed) continue;
    if (p.installmentCount > 1) continue;
    if (paymentFingerprint(p) !== fp) continue;
    subtotalUgx += p.tuitionUgx + p.functionalFeesUgx;
    totalUgx += p.totalUgx;
  }
  return { subtotalUgx, totalUgx };
}

export function buildContextBalance(
  quote: NonNullable<Awaited<ReturnType<typeof quoteObligation>>>,
  opts: {
    programmeCode: string;
    year: number;
    semester: number;
    feeSelectionMode: ProgrammeFeeSelectionMode;
  },
  payments: PaymentBalanceRow[],
  installmentPlans: InstallmentPlanBalance[],
): ContextBalance {
  const fp = obligationFingerprint({
    programmeCode: opts.programmeCode,
    year: opts.year,
    semester: opts.semester,
    feeSelectionMode: opts.feeSelectionMode,
    includedFeeIds: quote.includedFeeIds,
  });

  let confirmedPaidSubtotal = 0;
  let confirmedPaidTotal = 0;

  const { subtotalUgx, totalUgx } = sumConfirmedForFingerprint(payments, fp);
  confirmedPaidSubtotal += subtotalUgx;
  confirmedPaidTotal += totalUgx;

  for (const plan of installmentPlans) {
    if (
      obligationFingerprint({
        programmeCode: plan.programmeCode,
        year: plan.year,
        semester: plan.semester,
        feeSelectionMode: plan.feeSelectionMode,
        includedFeeIds: plan.includedFeeIds,
      }) === fp
    ) {
      confirmedPaidSubtotal += plan.paidSubtotalUgx;
      confirmedPaidTotal += plan.paidTotalUgx;
    }
  }

  const remainingSubtotalUgx = Math.max(0, quote.subtotalUgx - confirmedPaidSubtotal);
  const expectedFullPayTotalUgx = quote.subtotalUgx + quote.platformFeeUgx;
  const remainingFullPayTotalUgx = Math.max(0, expectedFullPayTotalUgx - confirmedPaidTotal);

  return {
    programmeCode: opts.programmeCode,
    year: opts.year,
    semester: opts.semester,
    feeSelectionMode: opts.feeSelectionMode,
    expectedSubtotalUgx: quote.subtotalUgx,
    expectedPlatformFeeUgx: quote.platformFeeUgx,
    expectedFullPayTotalUgx,
    confirmedPaidSubtotalUgx: confirmedPaidSubtotal,
    confirmedPaidTotalUgx: confirmedPaidTotal,
    remainingSubtotalUgx,
    remainingFullPayTotalUgx,
    isFullyPaid: remainingSubtotalUgx === 0,
    includedFeeIds: quote.includedFeeIds,
  };
}

export async function loadStudentPayments(studentId: string): Promise<PaymentBalanceRow[]> {
  const rows = await prisma.payment.findMany({
    where: { studentId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapPaymentRow);
}

export async function getStudentBalanceSummary(opts: {
  studentId: string;
  organizationId: string;
  programmeCode: string;
  year: number;
  semester: number;
}): Promise<StudentBalanceSummary | null> {
  const payments = await loadStudentPayments(opts.studentId);
  const programme = await findProgrammeByCode(opts.programmeCode, opts.organizationId);

  const planIds = new Set<string>();
  for (const p of payments) {
    if (p.installmentCount > 1) {
      planIds.add(p.installmentPlanId ?? p.id);
    }
  }

  const installmentPlans: InstallmentPlanBalance[] = [];
  for (const planId of planIds) {
    const plan = buildInstallmentPlanBalance(planId, payments);
    if (plan && !plan.isComplete) installmentPlans.push(plan);
  }
  installmentPlans.sort((a, b) => b.year - a.year || b.semester - a.semester);

  const contexts: ContextBalance[] = [];
  for (const mode of ["semester", "year"] as const) {
    const quote = await quoteObligation({
      organizationId: opts.organizationId,
      programmeCode: opts.programmeCode,
      year: opts.year,
      semester: opts.semester,
      feeSelectionMode: mode,
    });
    if (!quote) continue;
    contexts.push(
      buildContextBalance(
        quote,
        {
          programmeCode: opts.programmeCode,
          year: opts.year,
          semester: opts.semester,
          feeSelectionMode: mode,
        },
        payments,
        installmentPlans,
      ),
    );
  }

  return {
    studentId: opts.studentId,
    organizationId: opts.organizationId,
    installmentPlans,
    contexts,
    progress: programme ? buildStudentProgrammeProgress(programme, payments) : null,
  };
}

export async function assertCanStartCheckoutPayment(opts: {
  studentId: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode: ProgrammeFeeSelectionMode;
  feeIds?: string[];
  installmentPlanId?: string;
  installmentIndex?: number;
}): Promise<{ ok: true; installmentPlanId?: string; installmentIndex?: number } | { ok: false; error: string }> {
  const student = await prisma.student.findUnique({
    where: { id: opts.studentId },
    select: { organizationId: true },
  });
  if (!student) return { ok: false, error: "Student not found" };

  const payments = await loadStudentPayments(opts.studentId);

  if (opts.installmentPlanId) {
    const plan = buildInstallmentPlanBalance(opts.installmentPlanId, payments);
    if (!plan) return { ok: false, error: "Installment plan not found" };
    const idx = opts.installmentIndex ?? plan.nextDueIndex;
    if (!idx) return { ok: false, error: "This installment plan is already fully paid" };
    const slice = plan.slices.find((s) => s.index === idx);
    if (!slice) return { ok: false, error: "Invalid installment" };
    if (slice.status === "paid") return { ok: false, error: `Installment ${idx} is already paid` };
    if (slice.status === "pending") {
      return { ok: false, error: `Installment ${idx} has a pending payment — complete or cancel it first` };
    }
    return { ok: true, installmentPlanId: opts.installmentPlanId, installmentIndex: idx };
  }

  const p = await findProgrammeByCode(opts.programmeCode, student.organizationId);
  if (!p) return { ok: false, error: "Programme not found" };

  let rows;
  try {
    const resolved = resolveFeeRowsForSelection(p.fees, {
      mode: opts.feeSelectionMode,
      year: opts.year,
      semester: opts.semester,
      selectedIds: opts.feeIds?.length ? opts.feeIds : undefined,
    });
    rows = resolved.rows;
  } catch {
    return { ok: false, error: "Invalid fee line selection" };
  }

  const includedFeeIds = rows.map((r) => r.id);
  const fp = obligationFingerprint({
    programmeCode: opts.programmeCode,
    year: opts.year,
    semester: opts.semester,
    feeSelectionMode: opts.feeSelectionMode,
    includedFeeIds,
  });

  for (const pay of payments) {
    if (pay.installmentCount > 1) {
      const planId = pay.installmentPlanId ?? pay.id;
      const plan = buildInstallmentPlanBalance(planId, payments);
      if (!plan || plan.isComplete) continue;
      const planFp = obligationFingerprint({
        programmeCode: plan.programmeCode,
        year: plan.year,
        semester: plan.semester,
        feeSelectionMode: plan.feeSelectionMode,
        includedFeeIds: plan.includedFeeIds,
      });
      if (planFp === fp) {
        return {
          ok: false,
          error:
            "You already have an active installment plan for these fees. Pay the next installment from your balance or student portal.",
        };
      }
    }
  }

  if (hasPendingFullPaymentForFingerprint(payments, fp)) {
    return {
      ok: false,
      error:
        "You already have a pending payment for these fees. Complete it or wait for confirmation before starting another.",
    };
  }

  const quote = await quoteObligation({
    organizationId: student.organizationId,
    programmeCode: opts.programmeCode,
    year: opts.year,
    semester: opts.semester,
    feeSelectionMode: opts.feeSelectionMode,
    feeIds: includedFeeIds,
  });
  if (!quote) return { ok: false, error: "No fee schedule for this period" };

  const ctx = buildContextBalance(
    quote,
    {
      programmeCode: opts.programmeCode,
      year: opts.year,
      semester: opts.semester,
      feeSelectionMode: opts.feeSelectionMode,
    },
    payments,
    [],
  );

  if (ctx.isFullyPaid) {
    return { ok: false, error: "These fees are already fully paid for this period" };
  }

  return { ok: true };
}

export async function resolveInstallmentPlanForPayment(
  studentId: string,
  installmentPlanId: string,
): Promise<InstallmentPlanBalance | null> {
  const payments = await loadStudentPayments(studentId);
  return buildInstallmentPlanBalance(installmentPlanId, payments);
}

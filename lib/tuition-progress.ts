import { ProgrammeFeeRecurrence } from "@prisma/client";

type ProgrammeFeeLike = {
  id?: string | null;
  year: number;
  semester: number;
  recurrence?: ProgrammeFeeRecurrence | string | null;
  tuitionUgx: number;
  functionalFeesUgx: number;
};

type ProgrammeLike = {
  code: string;
  durationYears?: number | null;
  semestersPerYear?: number | null;
  fees: ProgrammeFeeLike[];
};

type PaymentLike = {
  id?: string;
  status: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode?: string | null;
  includedFeeIds?: string[] | null;
  tuitionUgx: number;
  functionalFeesUgx: number;
  totalUgx: number;
  installmentCount?: number | null;
  installmentPlanId?: string | null;
};

export type ProgrammeDurationSummary = {
  durationYears: number;
  semestersPerYear: number;
  totalSemesters: number;
  source: "configured" | "fee_schedule" | "empty";
};

export type ProgrammePeriodDetail = {
  year: number;
  semester: number;
  feeLineCount: number;
  tuitionUgx: number;
  functionalFeesUgx: number;
  totalUgx: number;
  hasFeeSchedule: boolean;
};

export type StudentProgrammeProgress = ProgrammeDurationSummary & {
  programmeCode: string;
  completedSemesters: number;
  remainingSemesters: number;
  completedYears: number;
  remainingYears: number;
  periods: Array<
    ProgrammePeriodDetail & {
      isCompleted: boolean;
      paidSubtotalUgx: number;
      paidTotalUgx: number;
    }
  >;
  completedPeriods: ProgrammePeriodDetail[];
  remainingPeriods: ProgrammePeriodDetail[];
};

type PeriodWithProgress = ProgrammePeriodDetail & {
  isCompleted: boolean;
  paidSubtotalUgx: number;
  paidTotalUgx: number;
};

function toPeriodDetail(period: PeriodWithProgress): ProgrammePeriodDetail {
  return {
    year: period.year,
    semester: period.semester,
    feeLineCount: period.feeLineCount,
    tuitionUgx: period.tuitionUgx,
    functionalFeesUgx: period.functionalFeesUgx,
    totalUgx: period.totalUgx,
    hasFeeSchedule: period.hasFeeSchedule,
  };
}

function positiveInt(value: number | null | undefined): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : 0;
}

function normalizeRecurrence(value: ProgrammeFeeLike["recurrence"]): ProgrammeFeeRecurrence {
  if (value === ProgrammeFeeRecurrence.once) return ProgrammeFeeRecurrence.once;
  if (value === ProgrammeFeeRecurrence.per_year) return ProgrammeFeeRecurrence.per_year;
  return ProgrammeFeeRecurrence.per_semester;
}

function feeAppliesToPeriod(fee: ProgrammeFeeLike, year: number, semester: number): boolean {
  if (fee.year !== year) return false;
  const recurrence = normalizeRecurrence(fee.recurrence);
  if (recurrence === ProgrammeFeeRecurrence.per_year) return true;
  return fee.semester === semester;
}

export function getProgrammeDurationSummary(programme: ProgrammeLike): ProgrammeDurationSummary {
  const configuredYears = positiveInt(programme.durationYears);
  const configuredSemesters = positiveInt(programme.semestersPerYear);
  if (configuredYears > 0 && configuredSemesters > 0) {
    return {
      durationYears: configuredYears,
      semestersPerYear: configuredSemesters,
      totalSemesters: configuredYears * configuredSemesters,
      source: "configured",
    };
  }

  let maxYear = 0;
  let maxSemester = 0;
  for (const fee of programme.fees) {
    if (fee.year > maxYear) maxYear = fee.year;
    if (fee.semester > maxSemester) maxSemester = fee.semester;
  }

  if (maxYear <= 0) {
    return { durationYears: 0, semestersPerYear: 0, totalSemesters: 0, source: "empty" };
  }

  const semestersPerYear = maxSemester > 0 ? maxSemester : 3;
  return {
    durationYears: maxYear,
    semestersPerYear,
    totalSemesters: maxYear * semestersPerYear,
    source: "fee_schedule",
  };
}

export function getProgrammePeriodDetails(programme: ProgrammeLike): ProgrammePeriodDetail[] {
  const summary = getProgrammeDurationSummary(programme);
  const periods: ProgrammePeriodDetail[] = [];

  for (let year = 1; year <= summary.durationYears; year++) {
    for (let semester = 1; semester <= summary.semestersPerYear; semester++) {
      const fees = programme.fees.filter((fee) => feeAppliesToPeriod(fee, year, semester));
      const tuitionUgx = fees.reduce((sum, fee) => sum + fee.tuitionUgx, 0);
      const functionalFeesUgx = fees.reduce((sum, fee) => sum + fee.functionalFeesUgx, 0);
      periods.push({
        year,
        semester,
        feeLineCount: fees.length,
        tuitionUgx,
        functionalFeesUgx,
        totalUgx: tuitionUgx + functionalFeesUgx,
        hasFeeSchedule: fees.length > 0,
      });
    }
  }

  return periods;
}

function paymentAppliesToPeriod(payment: PaymentLike, year: number, semester: number): boolean {
  /** Full-programme bundle covers every (year, semester) in the programme. */
  if (payment.feeSelectionMode === "programme") return true;
  if (payment.year !== year) return false;
  return payment.feeSelectionMode === "year" || payment.semester === semester;
}

function completeInstallmentPlanIds(payments: PaymentLike[]): Set<string> {
  const byPlan = new Map<string, PaymentLike[]>();
  for (const payment of payments) {
    if ((payment.installmentCount ?? 1) <= 1) continue;
    const key = payment.installmentPlanId ?? payment.id ?? `${payment.programmeCode}:${payment.year}:${payment.semester}`;
    byPlan.set(key, [...(byPlan.get(key) ?? []), payment]);
  }

  const complete = new Set<string>();
  for (const [planId, rows] of byPlan) {
    const expected = Math.max(1, rows[0]?.installmentCount ?? 1);
    const confirmed = rows.filter((row) => row.status === "confirmed").length;
    if (confirmed >= expected) complete.add(planId);
  }
  return complete;
}

function isPaymentCompleted(payment: PaymentLike, completePlans: Set<string>): boolean {
  if (payment.status !== "confirmed") return false;
  if ((payment.installmentCount ?? 1) <= 1) return true;
  const key = payment.installmentPlanId ?? payment.id ?? `${payment.programmeCode}:${payment.year}:${payment.semester}`;
  return completePlans.has(key);
}

export function buildStudentProgrammeProgress(
  programme: ProgrammeLike,
  payments: PaymentLike[],
): StudentProgrammeProgress {
  const summary = getProgrammeDurationSummary(programme);
  const basePeriods = getProgrammePeriodDetails(programme);
  const completePlans = completeInstallmentPlanIds(payments);
  const sameProgrammePayments = payments.filter(
    (payment) => payment.programmeCode.trim().toUpperCase() === programme.code.trim().toUpperCase(),
  );

  const periods = basePeriods.map((period) => {
    const expectedFees = programme.fees.filter((fee) => feeAppliesToPeriod(fee, period.year, period.semester));
    const expectedIds = expectedFees.map((fee) => fee.id).filter((id): id is string => Boolean(id));
    const paidIds = new Set<string>();
    let paidSubtotalUgx = 0;
    let paidTotalUgx = 0;

    for (const payment of sameProgrammePayments) {
      if (!isPaymentCompleted(payment, completePlans)) continue;
      if (!paymentAppliesToPeriod(payment, period.year, period.semester)) continue;

      for (const id of payment.includedFeeIds ?? []) {
        paidIds.add(id);
      }

      if (!payment.includedFeeIds?.length) {
        paidSubtotalUgx += payment.tuitionUgx + payment.functionalFeesUgx;
        paidTotalUgx += payment.totalUgx;
      }
    }

    const hasPaidAllExpectedIds = expectedIds.length > 0 && expectedIds.every((id) => paidIds.has(id));
    const legacyPaidInFull = expectedIds.length === 0 && period.totalUgx > 0 && paidSubtotalUgx >= period.totalUgx;
    const isCompleted = hasPaidAllExpectedIds || legacyPaidInFull;

    return {
      ...period,
      isCompleted,
      paidSubtotalUgx,
      paidTotalUgx,
    };
  });

  const completedSemesters = periods.filter((period) => period.isCompleted).length;
  const completedYears = Array.from({ length: summary.durationYears }, (_, i) => i + 1).filter((year) =>
    periods.filter((period) => period.year === year).every((period) => period.isCompleted),
  ).length;

  const completedPeriods = periods.filter((period) => period.isCompleted).map(toPeriodDetail);
  const remainingPeriods = periods.filter((period) => !period.isCompleted).map(toPeriodDetail);

  return {
    programmeCode: programme.code,
    ...summary,
    completedSemesters,
    remainingSemesters: Math.max(0, summary.totalSemesters - completedSemesters),
    completedYears,
    remainingYears: Math.max(0, summary.durationYears - completedYears),
    periods,
    completedPeriods,
    remainingPeriods,
  };
}

import type { InstitutionTier } from "@prisma/client";

export type AcademicPeriodLabels = {
  periodSingular: string;
  periodPlural: string;
  periodsPerYear: string;
  perPeriodRecurrence: string;
  payForThisPeriodOnly: string;
  yearWithAllPeriods: string;
  wholeProgrammePeriods: string;
  coverageIntro: string;
  periodPickerLabel: string;
  periodOption: (n: number) => string;
  periodShort: (n: number) => string;
  linePeriodSuffix: (n: number) => string;
};

export function isSchoolInstitutionTier(tier: InstitutionTier | string | null | undefined): boolean {
  return tier === "school";
}

/** UI labels for checkout, admin, and receipts. DB still uses `semester` column for period index. */
export function academicPeriodLabels(
  tier: InstitutionTier | string | null | undefined,
): AcademicPeriodLabels {
  const school = isSchoolInstitutionTier(tier);
  if (school) {
    return {
      periodSingular: "Term",
      periodPlural: "Terms",
      periodsPerYear: "Terms / year",
      perPeriodRecurrence: "Per term",
      payForThisPeriodOnly: "Pay for this term only",
      yearWithAllPeriods: "Pay for Year {year} with all its terms",
      wholeProgrammePeriods: "every year and term",
      coverageIntro:
        "Pay for this term only, Year {year} with all its terms, or the whole programme (every year and term). Each card lists items and UGX costs for that option.",
      periodPickerLabel: "Term",
      periodOption: (n) => `Term ${n}`,
      periodShort: (n) => `Term ${n}`,
      linePeriodSuffix: (n) => (n > 0 ? ` · Term ${n}` : ""),
    };
  }
  return {
    periodSingular: "Semester",
    periodPlural: "Semesters",
    periodsPerYear: "Semesters / year",
    perPeriodRecurrence: "Per semester",
    payForThisPeriodOnly: "Pay for this semester only",
    yearWithAllPeriods: "Pay for Year {year} with all its semesters",
    wholeProgrammePeriods: "every year and semester",
    coverageIntro:
      "Pay for this semester only, Year {year} with all its semesters, or the whole programme (every year and semester). Each card lists items and UGX costs for that option.",
    periodPickerLabel: "Semester",
    periodOption: (n) => `Semester ${n}`,
    periodShort: (n) => `Sem ${n}`,
    linePeriodSuffix: (n) => (n > 0 ? ` · Sem ${n}` : ""),
  };
}

export function periodIndexOptions(periodsPerYear: number | null | undefined): number[] {
  const n = Math.max(1, Math.min(3, Math.round(periodsPerYear ?? 0) || 3));
  return Array.from({ length: n }, (_, i) => i + 1);
}

export function defaultPeriodsPerYear(tier: InstitutionTier | string | null | undefined): number {
  return isSchoolInstitutionTier(tier) ? 3 : 3;
}

/** Receipt / ledger year + period index (e.g. `Yr 1 · Term 2`). */
export function receiptYearPeriodLabel(
  year: number,
  periodIndex: number,
  tier: InstitutionTier | string | null | undefined,
): string {
  const labels = academicPeriodLabels(tier);
  if (periodIndex > 0) return `Yr ${year} · ${labels.periodOption(periodIndex)}`;
  if (year > 0) return `Yr ${year}`;
  return "";
}

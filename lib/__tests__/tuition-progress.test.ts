import { describe, expect, it } from "vitest";
import { ProgrammeFeeRecurrence, ProgrammeTrack } from "@prisma/client";
import {
  buildStudentProgrammeProgress,
  getProgrammeDurationSummary,
  getProgrammePeriodDetails,
} from "@/lib/tuition-progress";

function programme(overrides: {
  code?: string;
  durationYears?: number | null;
  semestersPerYear?: number | null;
  fees?: Array<{
    id?: string;
    year: number;
    semester: number;
    tuitionUgx: number;
    functionalFeesUgx: number;
    recurrence?: ProgrammeFeeRecurrence;
  }>;
} = {}) {
  return {
    code: overrides.code ?? "BEP",
    name: "Bachelor of Education",
    track: ProgrammeTrack.regular,
    durationYears: overrides.durationYears ?? null,
    semestersPerYear: overrides.semestersPerYear ?? null,
    fees: (overrides.fees ?? []).map((f, idx) => ({
      id: f.id ?? `fee-${idx}`,
      year: f.year,
      semester: f.semester,
      tuitionUgx: f.tuitionUgx,
      functionalFeesUgx: f.functionalFeesUgx,
      recurrence: f.recurrence ?? ProgrammeFeeRecurrence.per_semester,
    })),
  };
}

function payment(overrides: {
  status?: string;
  programmeCode?: string;
  year: number;
  semester: number;
  feeSelectionMode?: string;
  includedFeeIds?: string[];
  tuitionUgx?: number;
  functionalFeesUgx?: number;
  totalUgx?: number;
  installmentCount?: number;
  installmentPlanId?: string;
  id?: string;
}) {
  return {
    id: overrides.id ?? `pay-${overrides.year}-${overrides.semester}`,
    status: overrides.status ?? "confirmed",
    programmeCode: overrides.programmeCode ?? "BEP",
    year: overrides.year,
    semester: overrides.semester,
    feeSelectionMode: overrides.feeSelectionMode ?? "semester",
    includedFeeIds: overrides.includedFeeIds ?? null,
    tuitionUgx: overrides.tuitionUgx ?? 1_000_000,
    functionalFeesUgx: overrides.functionalFeesUgx ?? 200_000,
    totalUgx: overrides.totalUgx ?? 1_200_000,
    installmentCount: overrides.installmentCount ?? 1,
    installmentPlanId: overrides.installmentPlanId ?? null,
  };
}

describe("getProgrammeDurationSummary", () => {
  it("returns configured duration when explicitly set", () => {
    const p = programme({ durationYears: 3, semestersPerYear: 3 });
    expect(getProgrammeDurationSummary(p)).toEqual({
      durationYears: 3,
      semestersPerYear: 3,
      totalSemesters: 9,
      source: "configured",
    });
  });

  it("infers from fee schedule when configured fields missing", () => {
    const p = programme({
      durationYears: null,
      semestersPerYear: null,
      fees: [
        { year: 1, semester: 1, tuitionUgx: 100, functionalFeesUgx: 10 },
        { year: 1, semester: 2, tuitionUgx: 100, functionalFeesUgx: 10 },
        { year: 2, semester: 1, tuitionUgx: 100, functionalFeesUgx: 10 },
        { year: 2, semester: 3, tuitionUgx: 100, functionalFeesUgx: 10 },
      ],
    });
    expect(getProgrammeDurationSummary(p)).toEqual({
      durationYears: 2,
      semestersPerYear: 3,
      totalSemesters: 6,
      source: "fee_schedule",
    });
  });

  it("falls back to 3 semesters per year when only year info present", () => {
    const p = programme({
      durationYears: null,
      semestersPerYear: null,
      fees: [{ year: 4, semester: 0, tuitionUgx: 100, functionalFeesUgx: 10, recurrence: ProgrammeFeeRecurrence.per_year }],
    });
    expect(getProgrammeDurationSummary(p)).toMatchObject({
      durationYears: 4,
      semestersPerYear: 3,
      totalSemesters: 12,
      source: "fee_schedule",
    });
  });

  it("returns empty source when no fees and no configuration", () => {
    expect(getProgrammeDurationSummary(programme())).toEqual({
      durationYears: 0,
      semestersPerYear: 0,
      totalSemesters: 0,
      source: "empty",
    });
  });
});

describe("getProgrammePeriodDetails", () => {
  it("enumerates a period per (year, semester) within duration", () => {
    const p = programme({
      durationYears: 2,
      semestersPerYear: 3,
      fees: [{ year: 1, semester: 1, tuitionUgx: 500, functionalFeesUgx: 100 }],
    });
    const periods = getProgrammePeriodDetails(p);
    expect(periods).toHaveLength(6);
    expect(periods[0]).toMatchObject({ year: 1, semester: 1, totalUgx: 600, hasFeeSchedule: true });
    expect(periods[1]).toMatchObject({ year: 1, semester: 2, totalUgx: 0, hasFeeSchedule: false });
  });
});

describe("buildStudentProgrammeProgress", () => {
  it("flags semester periods that have been paid in full via included fee ids", () => {
    const p = programme({
      durationYears: 2,
      semestersPerYear: 2,
      fees: [
        { id: "f-1", year: 1, semester: 1, tuitionUgx: 800, functionalFeesUgx: 200 },
        { id: "f-2", year: 1, semester: 2, tuitionUgx: 800, functionalFeesUgx: 200 },
        { id: "f-3", year: 2, semester: 1, tuitionUgx: 800, functionalFeesUgx: 200 },
        { id: "f-4", year: 2, semester: 2, tuitionUgx: 800, functionalFeesUgx: 200 },
      ],
    });
    const payments = [
      payment({ year: 1, semester: 1, includedFeeIds: ["f-1"] }),
      payment({ year: 1, semester: 2, includedFeeIds: ["f-2"] }),
    ];

    const progress = buildStudentProgrammeProgress(p, payments);
    expect(progress.completedSemesters).toBe(2);
    expect(progress.completedYears).toBe(1);
    expect(progress.remainingSemesters).toBe(2);
    expect(progress.remainingYears).toBe(1);
    expect(progress.completedPeriods.map((c) => `${c.year}-${c.semester}`)).toEqual(["1-1", "1-2"]);
  });

  it("treats year-mode confirmed payments as completing each semester in that year", () => {
    const p = programme({
      durationYears: 2,
      semestersPerYear: 3,
      fees: [
        { id: "fa", year: 1, semester: 1, tuitionUgx: 100, functionalFeesUgx: 0 },
        { id: "fb", year: 1, semester: 2, tuitionUgx: 100, functionalFeesUgx: 0 },
        { id: "fc", year: 1, semester: 3, tuitionUgx: 100, functionalFeesUgx: 0 },
      ],
    });
    const payments = [
      payment({
        year: 1,
        semester: 0,
        feeSelectionMode: "year",
        includedFeeIds: ["fa", "fb", "fc"],
      }),
    ];

    const progress = buildStudentProgrammeProgress(p, payments);
    expect(progress.completedYears).toBe(1);
    expect(progress.completedSemesters).toBe(3);
  });

  it("ignores pending and failed payments", () => {
    const p = programme({
      durationYears: 1,
      semestersPerYear: 1,
      fees: [{ id: "only-fee", year: 1, semester: 1, tuitionUgx: 1000, functionalFeesUgx: 0 }],
    });
    const payments = [
      payment({ year: 1, semester: 1, status: "pending", includedFeeIds: ["only-fee"] }),
      payment({ year: 1, semester: 1, status: "failed", includedFeeIds: ["only-fee"] }),
    ];

    expect(buildStudentProgrammeProgress(p, payments).completedSemesters).toBe(0);
  });

  it("requires all instalments to be confirmed before counting a semester as complete", () => {
    const p = programme({
      durationYears: 1,
      semestersPerYear: 1,
      fees: [{ id: "only-fee", year: 1, semester: 1, tuitionUgx: 1000, functionalFeesUgx: 0 }],
    });
    const payments = [
      payment({
        id: "i1",
        year: 1,
        semester: 1,
        includedFeeIds: ["only-fee"],
        installmentCount: 3,
        installmentPlanId: "plan-1",
      }),
      payment({
        id: "i2",
        year: 1,
        semester: 1,
        includedFeeIds: ["only-fee"],
        installmentCount: 3,
        installmentPlanId: "plan-1",
        status: "pending",
      }),
    ];

    expect(buildStudentProgrammeProgress(p, payments).completedSemesters).toBe(0);
  });

  it("ignores payments belonging to a different programme code", () => {
    const p = programme({
      code: "BEP",
      durationYears: 1,
      semestersPerYear: 1,
      fees: [{ id: "only-fee", year: 1, semester: 1, tuitionUgx: 500, functionalFeesUgx: 0 }],
    });
    const payments = [
      payment({ programmeCode: "DEP", year: 1, semester: 1, includedFeeIds: ["only-fee"] }),
    ];
    expect(buildStudentProgrammeProgress(p, payments).completedSemesters).toBe(0);
  });
});

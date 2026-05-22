import { describe, it, expect } from "vitest";
import { ProgrammeFeeRecurrence } from "@prisma/client";
import { aggregateProgrammeFeesForPeriod } from "@/lib/programmes";

function row(
  partial: Partial<{
    year: number;
    semester: number;
    tuitionUgx: number;
    functionalFeesUgx: number;
    recurrence: ProgrammeFeeRecurrence;
    feeKey: string;
  }>
) {
  return {
    year: 1,
    semester: 1,
    tuitionUgx: 0,
    functionalFeesUgx: 0,
    recurrence: ProgrammeFeeRecurrence.per_semester,
    feeKey: "default",
    ...partial,
  };
}

describe("aggregateProgrammeFeesForPeriod", () => {
  it("sums per_semester and per_year for the selected semester", () => {
    const fees = [
      row({
        year: 1,
        semester: 1,
        recurrence: ProgrammeFeeRecurrence.per_semester,
        tuitionUgx: 100,
        functionalFeesUgx: 10,
      }),
      row({
        year: 1,
        semester: 0,
        recurrence: ProgrammeFeeRecurrence.per_year,
        tuitionUgx: 50,
        functionalFeesUgx: 20,
      }),
    ];
    expect(aggregateProgrammeFeesForPeriod(fees, 1, 1)).toEqual({
      tuitionUgx: 150,
      functionalFeesUgx: 30,
    });
  });

  it("includes per_year once for year 2 across semesters", () => {
    const fees = [
      row({
        year: 2,
        semester: 0,
        recurrence: ProgrammeFeeRecurrence.per_year,
        tuitionUgx: 0,
        functionalFeesUgx: 5_000,
      }),
    ];
    expect(aggregateProgrammeFeesForPeriod(fees, 2, 3)).toEqual({
      tuitionUgx: 0,
      functionalFeesUgx: 5_000,
    });
  });

  it("does not apply per_year from another year", () => {
    const fees = [
      row({
        year: 1,
        semester: 0,
        recurrence: ProgrammeFeeRecurrence.per_year,
        tuitionUgx: 999,
        functionalFeesUgx: 0,
      }),
    ];
    expect(aggregateProgrammeFeesForPeriod(fees, 2, 1)).toBeNull();
  });

  it("applies once only for the exact year and semester", () => {
    const fees = [
      row({
        year: 1,
        semester: 2,
        recurrence: ProgrammeFeeRecurrence.once,
        tuitionUgx: 10_000,
        functionalFeesUgx: 0,
      }),
    ];
    expect(aggregateProgrammeFeesForPeriod(fees, 1, 2)).toEqual({ tuitionUgx: 10_000, functionalFeesUgx: 0 });
    expect(aggregateProgrammeFeesForPeriod(fees, 1, 1)).toBeNull();
  });

  it("treats missing recurrence as per_semester (legacy Mongo documents)", () => {
    const fees = [{ year: 1, semester: 1, tuitionUgx: 42, functionalFeesUgx: 8 }];
    expect(aggregateProgrammeFeesForPeriod(fees, 1, 1)).toEqual({ tuitionUgx: 42, functionalFeesUgx: 8 });
    expect(aggregateProgrammeFeesForPeriod(fees, 1, 2)).toBeNull();
  });
});

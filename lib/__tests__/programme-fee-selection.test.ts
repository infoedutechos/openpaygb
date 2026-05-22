import { describe, it, expect } from "vitest";
import { ProgrammeFeeRecurrence } from "@prisma/client";
import {
  listFeeRowsForAcademicYear,
  listFeeRowsForSemester,
  resolveFeeRowsForSelection,
  sumFeeRows,
} from "@/lib/programmes";

function fee(
  id: string,
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
    id,
    year: 1,
    semester: 1,
    tuitionUgx: 0,
    functionalFeesUgx: 0,
    recurrence: ProgrammeFeeRecurrence.per_semester,
    feeKey: "default",
    ...partial,
  };
}

describe("listFeeRowsForSemester", () => {
  it("returns distinct rows for the semester", () => {
    const rows = [
      fee("a", { year: 1, semester: 1, tuitionUgx: 100, recurrence: ProgrammeFeeRecurrence.per_semester }),
      fee("b", { year: 1, semester: 2, tuitionUgx: 50, recurrence: ProgrammeFeeRecurrence.per_semester }),
    ];
    expect(listFeeRowsForSemester(rows, 1, 1).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("listFeeRowsForAcademicYear", () => {
  it("includes per-semester rows for each semester and per_year once", () => {
    const rows = [
      fee("s1", { year: 2, semester: 1, tuitionUgx: 10, recurrence: ProgrammeFeeRecurrence.per_semester }),
      fee("s2", { year: 2, semester: 2, tuitionUgx: 20, recurrence: ProgrammeFeeRecurrence.per_semester }),
      fee("y", { year: 2, semester: 0, tuitionUgx: 5, recurrence: ProgrammeFeeRecurrence.per_year }),
      fee("other", { year: 1, semester: 1, tuitionUgx: 999, recurrence: ProgrammeFeeRecurrence.per_semester }),
    ];
    const out = listFeeRowsForAcademicYear(rows, 2);
    expect(out.map((r) => r.id).sort()).toEqual(["s1", "s2", "y"]);
    expect(sumFeeRows(out).tuitionUgx).toBe(35);
  });
});

describe("resolveFeeRowsForSelection", () => {
  it("returns subset when selectedIds provided", () => {
    const rows = [
      fee("a", { year: 1, semester: 1, tuitionUgx: 10, recurrence: ProgrammeFeeRecurrence.per_semester }),
      fee("b", { year: 1, semester: 1, tuitionUgx: 20, recurrence: ProgrammeFeeRecurrence.per_semester }),
    ];
    const { rows: picked, pool } = resolveFeeRowsForSelection(rows, {
      mode: "semester",
      year: 1,
      semester: 1,
      selectedIds: ["a"],
    });
    expect(pool.map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(picked.map((r) => r.id)).toEqual(["a"]);
  });
});

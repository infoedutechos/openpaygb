import { describe, expect, it } from "vitest";
import {
  academicPeriodLabels,
  isSchoolInstitutionTier,
  periodIndexOptions,
  receiptYearPeriodLabel,
} from "@/lib/academic-period";

describe("academic-period", () => {
  it("uses term labels for school tier", () => {
    const labels = academicPeriodLabels("school");
    expect(labels.periodSingular).toBe("Term");
    expect(labels.payForThisPeriodOnly).toContain("term");
    expect(labels.periodOption(2)).toBe("Term 2");
  });

  it("uses semester labels for university tier", () => {
    const labels = academicPeriodLabels("university");
    expect(labels.periodSingular).toBe("Semester");
    expect(labels.periodOption(1)).toBe("Semester 1");
  });

  it("builds period index options from programme config", () => {
    expect(periodIndexOptions(2)).toEqual([1, 2]);
    expect(periodIndexOptions(0)).toEqual([1, 2, 3]);
    expect(isSchoolInstitutionTier("school")).toBe(true);
  });

  it("formats receipt year + period for schools", () => {
    expect(receiptYearPeriodLabel(1, 2, "school")).toBe("Yr 1 · Term 2");
    expect(receiptYearPeriodLabel(2, 1, "university")).toBe("Yr 2 · Semester 1");
  });
});

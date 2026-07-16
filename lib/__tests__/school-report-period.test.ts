import { describe, expect, it } from "vitest";
import {
  parseSchoolReportDateRange,
  schoolReportDateFilter,
} from "@/lib/school-report-period";
import { calculateInventoryTotals } from "@/lib/school-reports";

describe("school report period", () => {
  it("parses an inclusive UTC date range", () => {
    const result = parseSchoolReportDateRange("2026-07-01", "2026-07-31");
    expect(result.error).toBeUndefined();
    expect(result.from?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(result.to?.toISOString()).toBe("2026-07-31T23:59:59.999Z");
  });

  it("rejects invalid and reversed ranges", () => {
    expect(parseSchoolReportDateRange("not-a-date", null).error).toBe("Invalid from date");
    expect(parseSchoolReportDateRange("2026-07-31", "2026-07-01").error).toBe(
      "From date must be on or before to date",
    );
  });

  it("builds optional Prisma date filters", () => {
    const from = new Date("2026-07-01T00:00:00.000Z");
    expect(schoolReportDateFilter(from)).toEqual({ gte: from });
    expect(schoolReportDateFilter()).toBeUndefined();
  });
});

describe("inventory report valuation", () => {
  it("keeps quantities separate from monetary value", () => {
    expect(
      calculateInventoryTotals([
        { availableQty: 4, unavailableQty: 1, unitCostUgx: 12_500 },
        { availableQty: 2, unavailableQty: 3, unitCostUgx: 25_000 },
      ]),
    ).toEqual({
      availableQty: 6,
      unavailableQty: 4,
      availableValueUgx: 100_000,
    });
  });
});

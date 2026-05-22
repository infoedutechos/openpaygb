import { describe, expect, it } from "vitest";
import { buildInstallmentSchedule, splitSubtotalUgx } from "@/lib/installments";

describe("splitSubtotalUgx", () => {
  it("splits remainder across earliest slices", () => {
    expect(splitSubtotalUgx(100_003, 3)).toEqual([33_335, 33_334, 33_334]);
  });
});

describe("buildInstallmentSchedule", () => {
  it("charges platform fee on each installment", () => {
    const s = buildInstallmentSchedule(600_000, 5_000, 3);
    expect(s.slices).toHaveLength(3);
    for (const slice of s.slices) {
      expect(slice.platformFeeUgx).toBe(5_000);
      expect(slice.totalUgx).toBe(slice.subtotalUgx + 5_000);
    }
    expect(s.fullPlanTotalUgx).toBe(600_000 + 5_000 * 3);
  });
});

import { describe, expect, it } from "vitest";
import {
  computePlatformFeeUgx,
  platformDefaultRuleFromRow,
  buildInstallmentScheduleFromRule,
} from "@/lib/checkout-platform-fee";

describe("checkout-platform-fee", () => {
  it("computes percent of subtotal", () => {
    const rule = { kind: "percent" as const, percent: 3 };
    expect(computePlatformFeeUgx(1_000_000, rule)).toBe(30_000);
    expect(computePlatformFeeUgx(500_000, rule)).toBe(15_000);
  });

  it("parses platform percent kind from row", () => {
    const rule = platformDefaultRuleFromRow({
      checkoutPlatformFeeDefaultKind: "percent",
      checkoutPlatformFeeDefaultUgx: -1,
      checkoutPlatformFeeDefaultPercent: 2.5,
    });
    expect(rule).toEqual({ kind: "percent", percent: 2.5 });
  });

  it("applies percent per installment slice", () => {
    const schedule = buildInstallmentScheduleFromRule(
      1_000_000,
      { kind: "percent", percent: 10 },
      2,
    );
    expect(schedule.slices).toHaveLength(2);
    expect(schedule.slices[0].platformFeeUgx).toBe(50_000);
    expect(schedule.slices[1].platformFeeUgx).toBe(50_000);
  });
});

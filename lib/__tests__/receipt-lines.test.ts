import { describe, it, expect } from "vitest";
import { ProgrammeFeeRecurrence } from "@prisma/client";
import { buildReceiptBreakdown } from "@/lib/receipt-lines";

const basePayment = {
  tuitionUgx: 800_000,
  functionalFeesUgx: 200_000,
  totalUgx: 1_010_000,
  platformFeeUgx: 10_000,
  tonAmount: 1.5,
  year: 1,
  semester: 1,
  feeSelectionMode: "semester",
  installmentCount: 1,
  installmentIndex: 1,
};

describe("buildReceiptBreakdown", () => {
  it("splits included fee lines by feeKey with tuition and functional columns", () => {
    const breakdown = buildReceiptBreakdown(
      {
        ...basePayment,
        includedFeeIds: ["lib", "guild"],
      },
      [
        {
          id: "lib",
          feeKey: "library",
          year: 1,
          semester: 1,
          tuitionUgx: 500_000,
          functionalFeesUgx: 50_000,
          recurrence: ProgrammeFeeRecurrence.per_semester,
        },
        {
          id: "guild",
          feeKey: "guild",
          year: 1,
          semester: 1,
          tuitionUgx: 300_000,
          functionalFeesUgx: 150_000,
          recurrence: ProgrammeFeeRecurrence.per_semester,
        },
      ],
    );

    expect(breakdown.lines).toHaveLength(2);
    expect(breakdown.lines[0]?.label).toBe("Library");
    expect(breakdown.lines[1]?.label).toBe("Guild");
    expect(breakdown.subtotalTuitionUgx).toBe(800_000);
    expect(breakdown.subtotalFunctionalUgx).toBe(200_000);
    expect(breakdown.totalUgx).toBe(1_010_000);
    expect(breakdown.isLegacyAggregate).toBe(false);
  });

  it("scales lines for installment payments", () => {
    const breakdown = buildReceiptBreakdown(
      {
        ...basePayment,
        tuitionUgx: 400_000,
        functionalFeesUgx: 100_000,
        totalUgx: 505_000,
        platformFeeUgx: 5_000,
        installmentCount: 2,
        installmentIndex: 1,
        installmentScheduleSubtotalUgx: 1_000_000,
        includedFeeIds: ["only"],
      },
      [
        {
          id: "only",
          feeKey: "ict",
          year: 1,
          semester: 1,
          tuitionUgx: 800_000,
          functionalFeesUgx: 200_000,
          recurrence: ProgrammeFeeRecurrence.per_semester,
        },
      ],
    );

    expect(breakdown.lines).toHaveLength(1);
    expect(breakdown.lines[0]?.label).toBe("Ict");
    expect(breakdown.lines[0]?.lineTotalUgx).toBe(500_000);
    expect(breakdown.installmentLabel).toBe("Installment 1 of 2");
  });

  it("falls back to tuition and functional aggregate when fee ids are missing", () => {
    const breakdown = buildReceiptBreakdown(
      { ...basePayment, includedFeeIds: [] },
      [],
    );

    expect(breakdown.isLegacyAggregate).toBe(true);
    expect(breakdown.lines.map((l) => l.label)).toEqual(["Tuition", "Functional fees"]);
  });
});

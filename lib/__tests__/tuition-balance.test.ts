import { describe, expect, it } from "vitest";
import { PaymentStatus } from "@prisma/client";
import {
  buildContextBalance,
  buildInstallmentPlanBalance,
  hasPendingFullPaymentForFingerprint,
  mapPaymentRow,
  obligationFingerprint,
  paymentFingerprint,
} from "@/lib/tuition-balance";

function pay(
  overrides: Partial<Parameters<typeof mapPaymentRow>[0]> & { id: string },
): ReturnType<typeof mapPaymentRow> {
  return mapPaymentRow({
    status: PaymentStatus.confirmed,
    programmeCode: "CS101",
    year: 1,
    semester: 1,
    feeSelectionMode: "semester",
    includedFeeIds: ["fee-a"],
    tuitionUgx: 300_000,
    functionalFeesUgx: 100_000,
    totalUgx: 405_000,
    platformFeeUgx: 5_000,
    installmentCount: 1,
    installmentIndex: 1,
    installmentPlanId: null,
    installmentScheduleSubtotalUgx: null,
    createdAt: new Date("2026-01-01"),
    confirmedAt: new Date("2026-01-02"),
    ...overrides,
  });
}

describe("obligationFingerprint", () => {
  it("normalizes programme code and sorts fee ids", () => {
    const a = obligationFingerprint({
      programmeCode: "cs101",
      year: 1,
      semester: 1,
      feeSelectionMode: "semester",
      includedFeeIds: ["b", "a"],
    });
    const b = obligationFingerprint({
      programmeCode: "CS101",
      year: 1,
      semester: 1,
      feeSelectionMode: "semester",
      includedFeeIds: ["a", "b"],
    });
    expect(a).toBe(b);
  });
});

describe("buildInstallmentPlanBalance", () => {
  it("tracks paid slices and next due index", () => {
    const planId = "plan-1";
    const payments = [
      pay({
        id: "p1",
        installmentCount: 3,
        installmentIndex: 1,
        installmentPlanId: planId,
        installmentScheduleSubtotalUgx: 600_000,
        tuitionUgx: 150_000,
        functionalFeesUgx: 50_000,
        totalUgx: 205_000,
        platformFeeUgx: 5_000,
      }),
    ];
    const plan = buildInstallmentPlanBalance(planId, payments);
    expect(plan).not.toBeNull();
    expect(plan!.slices[0].status).toBe("paid");
    expect(plan!.slices[1].status).toBe("due");
    expect(plan!.nextDueIndex).toBe(2);
    expect(plan!.remainingTotalUgx).toBeGreaterThan(0);
  });
});

describe("hasPendingFullPaymentForFingerprint", () => {
  it("returns true when a pending pay-in-full matches the obligation", () => {
    const fp = obligationFingerprint({
      programmeCode: "CS101",
      year: 1,
      semester: 1,
      feeSelectionMode: "semester",
      includedFeeIds: ["fee-a"],
    });
    const payments = [
      pay({
        id: "pending-1",
        status: PaymentStatus.pending,
        installmentCount: 1,
      }),
    ];
    expect(hasPendingFullPaymentForFingerprint(payments, fp)).toBe(true);
  });

  it("ignores confirmed full pay and pending installments", () => {
    const fp = obligationFingerprint({
      programmeCode: "CS101",
      year: 1,
      semester: 1,
      feeSelectionMode: "semester",
      includedFeeIds: ["fee-a"],
    });
    const payments = [
      pay({ id: "c1", status: PaymentStatus.confirmed, installmentCount: 1 }),
      pay({
        id: "p2",
        status: PaymentStatus.pending,
        installmentCount: 3,
        installmentIndex: 2,
        installmentPlanId: "plan-1",
      }),
    ];
    expect(hasPendingFullPaymentForFingerprint(payments, fp)).toBe(false);
  });
});

describe("buildContextBalance", () => {
  it("marks context fully paid after confirmed full payment", () => {
    const quote = {
      includedFeeIds: ["fee-a"],
      tuitionUgx: 300_000,
      functionalFeesUgx: 100_000,
      subtotalUgx: 400_000,
      platformFeeUgx: 5_000,
      installmentCount: 1 as const,
      fullPlanTotalUgx: 405_000,
      slices: [],
    };
    const payments = [
      pay({
        id: "full-1",
        tuitionUgx: 300_000,
        functionalFeesUgx: 100_000,
        totalUgx: 405_000,
      }),
    ];
    const ctx = buildContextBalance(
      quote,
      { programmeCode: "CS101", year: 1, semester: 1, feeSelectionMode: "semester" },
      payments,
      [],
    );
    expect(ctx.isFullyPaid).toBe(true);
    expect(ctx.remainingSubtotalUgx).toBe(0);
    expect(paymentFingerprint(payments[0])).toBe(
      obligationFingerprint({
        programmeCode: "CS101",
        year: 1,
        semester: 1,
        feeSelectionMode: "semester",
        includedFeeIds: ["fee-a"],
      }),
    );
  });
});

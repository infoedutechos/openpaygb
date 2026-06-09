import { describe, expect, it } from "vitest";
import { summarizeOutstandingUgx } from "@/lib/tuition-balance-compact";
import type { StudentBalanceSummary } from "@/lib/tuition-balance";

function summary(partial: Partial<StudentBalanceSummary>): StudentBalanceSummary {
  return {
    studentId: "s1",
    organizationId: "o1",
    installmentPlans: partial.installmentPlans ?? [],
    contexts: partial.contexts ?? [],
    progress: partial.progress ?? null,
  };
}

describe("summarizeOutstandingUgx", () => {
  it("returns max remaining across open contexts and plans", () => {
    const total = summarizeOutstandingUgx(
      summary({
        contexts: [
          {
            programmeCode: "BEP",
            year: 1,
            semester: 1,
            feeSelectionMode: "semester",
            expectedSubtotalUgx: 500_000,
            expectedPlatformFeeUgx: 5_000,
            expectedFullPayTotalUgx: 505_000,
            confirmedPaidSubtotalUgx: 0,
            confirmedPaidTotalUgx: 0,
            remainingSubtotalUgx: 500_000,
            remainingFullPayTotalUgx: 505_000,
            isFullyPaid: false,
            includedFeeIds: ["a"],
          },
        ],
        installmentPlans: [
          {
            installmentPlanId: "plan-1",
            programmeCode: "BEP",
            year: 1,
            semester: 2,
            feeSelectionMode: "semester",
            includedFeeIds: ["b"],
            installmentCount: 3,
            scheduleSubtotalUgx: 600_000,
            platformFeePerInstallmentUgx: 5_000,
            fullPlanTotalUgx: 615_000,
            paidTotalUgx: 205_000,
            paidSubtotalUgx: 200_000,
            remainingTotalUgx: 410_000,
            slices: [],
            nextDueIndex: 2,
            isComplete: false,
          },
        ],
      }),
    );
    expect(total).toBe(500_000);
  });

  it("returns zero when everything is paid", () => {
    const total = summarizeOutstandingUgx(
      summary({
        contexts: [
          {
            programmeCode: "BEP",
            year: 1,
            semester: 1,
            feeSelectionMode: "semester",
            expectedSubtotalUgx: 400_000,
            expectedPlatformFeeUgx: 5_000,
            expectedFullPayTotalUgx: 405_000,
            confirmedPaidSubtotalUgx: 400_000,
            confirmedPaidTotalUgx: 405_000,
            remainingSubtotalUgx: 0,
            remainingFullPayTotalUgx: 0,
            isFullyPaid: true,
            includedFeeIds: ["a"],
          },
        ],
      }),
    );
    expect(total).toBe(0);
  });
});

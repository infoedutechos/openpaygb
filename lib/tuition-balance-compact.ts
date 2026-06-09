import type { StudentBalanceSummary } from "@/lib/tuition-balance";

/** Highest outstanding UGX across open contexts and installment plans (for admin list sorting). */
export function summarizeOutstandingUgx(summary: StudentBalanceSummary): number {
  let max = 0;
  for (const ctx of summary.contexts) {
    if (!ctx.isFullyPaid && ctx.remainingSubtotalUgx > 0) {
      max = Math.max(max, ctx.remainingSubtotalUgx);
    }
  }
  for (const plan of summary.installmentPlans) {
    if (!plan.isComplete && plan.remainingTotalUgx > 0) {
      max = Math.max(max, plan.remainingTotalUgx);
    }
  }
  return max;
}

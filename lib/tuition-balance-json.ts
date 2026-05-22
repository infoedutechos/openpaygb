import type { StudentBalanceSummary } from "@/lib/tuition-balance";

export function serializeStudentBalance(summary: StudentBalanceSummary) {
  return {
    studentId: summary.studentId,
    organizationId: summary.organizationId,
    installmentPlans: summary.installmentPlans,
    contexts: summary.contexts,
    progress: summary.progress,
  };
}

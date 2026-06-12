import type { InstitutionTier } from "@prisma/client";
import { academicPeriodLabels } from "@/lib/academic-period";
import type { ProgrammeFeeRecurrenceKind } from "@/lib/programme-fee-recurrence-shared";

export function recurrenceLabel(
  r: ProgrammeFeeRecurrenceKind | null | undefined,
  tier?: InstitutionTier | string | null,
): string {
  if (r === "once") return "Paid once";
  if (r === "per_year") return "Per year";
  return academicPeriodLabels(tier).perPeriodRecurrence;
}

/** Human-readable label for a programme fee key (e.g. `library` → `Library`). */
export function formatFeeKeyLabel(feeKey: string): string {
  const k = feeKey.trim() || "default";
  if (k === "default") return "Standard fee";
  return k.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

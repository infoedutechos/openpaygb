import type { ProgrammeFeeRecurrenceKind } from "@/lib/programme-fee-recurrence-shared";

export function recurrenceLabel(r: ProgrammeFeeRecurrenceKind | null | undefined): string {
  if (r === "once") return "Paid once";
  if (r === "per_year") return "Per year";
  return "Per semester";
}

/** Human-readable label for a programme fee key (e.g. `library` → `Library`). */
export function formatFeeKeyLabel(feeKey: string): string {
  const k = feeKey.trim() || "default";
  if (k === "default") return "Standard fee";
  return k.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

import { ProgrammeFeeRecurrence } from "@prisma/client";

export function recurrenceLabel(r: ProgrammeFeeRecurrence | null | undefined): string {
  if (r === ProgrammeFeeRecurrence.once) return "Paid once";
  if (r === ProgrammeFeeRecurrence.per_year) return "Per year";
  return "Per semester";
}

/** Human-readable label for a programme fee key (e.g. `library` → `Library`). */
export function formatFeeKeyLabel(feeKey: string): string {
  const k = feeKey.trim() || "default";
  if (k === "default") return "Standard fee";
  return k.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

import { ProgrammeFeeRecurrence } from "@prisma/client";

export function feeSlotError(recurrence: ProgrammeFeeRecurrence, semester: number): string | null {
  if (recurrence === ProgrammeFeeRecurrence.per_year) {
    return semester !== 0 ? "Semester must be 0 for per-year fees" : null;
  }
  if (semester < 1 || semester > 3) {
    return "Semester must be 1–3 for once or per-semester fees";
  }
  return null;
}

export function normalizeProgrammeFeeKey(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "default";
  return t;
}

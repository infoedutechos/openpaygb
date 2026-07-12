/** School term helpers — Term 1–3 (maps reference app FIRST/SECOND/THIRD). */

export const SCHOOL_TERM_MIN = 1;
export const SCHOOL_TERM_MAX = 3;

export function normalizeSchoolTerm(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? parseInt(value, 10) : value ?? 1;
  if (!Number.isFinite(n) || n < SCHOOL_TERM_MIN) return SCHOOL_TERM_MIN;
  if (n > SCHOOL_TERM_MAX) return SCHOOL_TERM_MAX;
  return Math.trunc(n);
}

export function schoolTermLabel(term: number): string {
  const t = normalizeSchoolTerm(term);
  return `Term ${t}`;
}

export function schoolTermOrdinal(term: number): string {
  const t = normalizeSchoolTerm(term);
  if (t === 1) return "FIRST";
  if (t === 2) return "SECOND";
  return "THIRD";
}

export function schoolTermOptions(): { value: number; label: string; ordinal: string }[] {
  return [1, 2, 3].map((value) => ({
    value,
    label: schoolTermLabel(value),
    ordinal: schoolTermOrdinal(value),
  }));
}

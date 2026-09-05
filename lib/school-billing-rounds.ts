/** How often a fee head is billed when assigning school bills. */
export const SCHOOL_BILLING_ROUNDS = [
  { value: "once", label: "Once", hint: "Single charge for the selected term" },
  { value: "per_term", label: "Per term", hint: "Same amount on every term this session" },
  { value: "per_session", label: "Per session", hint: "One charge for the whole academic session" },
] as const;

export type SchoolBillingRound = (typeof SCHOOL_BILLING_ROUNDS)[number]["value"];

export function isSchoolBillingRound(v: unknown): v is SchoolBillingRound {
  return v === "once" || v === "per_term" || v === "per_session";
}

export function schoolBillingRoundLabel(round: string | null | undefined): string {
  const hit = SCHOOL_BILLING_ROUNDS.find((r) => r.value === round);
  return hit?.label ?? "Once";
}

/** Terms to create charges for, given the selected round and primary term. */
export function termsForBillingRound(
  round: SchoolBillingRound,
  selectedTerm: number,
  availableTermNumbers: number[],
): number[] {
  const terms =
    availableTermNumbers.length > 0
      ? [...new Set(availableTermNumbers)].filter((n) => n >= 1).sort((a, b) => a - b)
      : [1, 2, 3];

  if (round === "per_term") return terms;
  const t = terms.includes(selectedTerm) ? selectedTerm : (terms[0] ?? selectedTerm);
  return [t];
}

import { describe, expect, it } from "vitest";
import { termsForBillingRound, schoolBillingRoundLabel } from "@/lib/school-billing-rounds";

describe("school billing rounds", () => {
  it("once and per_session use the selected term", () => {
    expect(termsForBillingRound("once", 2, [1, 2, 3])).toEqual([2]);
    expect(termsForBillingRound("per_session", 1, [1, 2, 3])).toEqual([1]);
  });

  it("per_term expands to all available terms", () => {
    expect(termsForBillingRound("per_term", 1, [1, 2, 3])).toEqual([1, 2, 3]);
    expect(termsForBillingRound("per_term", 2, [1, 2])).toEqual([1, 2]);
  });

  it("falls back to 1–3 when no terms configured", () => {
    expect(termsForBillingRound("per_term", 1, [])).toEqual([1, 2, 3]);
  });

  it("labels rounds", () => {
    expect(schoolBillingRoundLabel("per_term")).toBe("Per term");
    expect(schoolBillingRoundLabel(undefined)).toBe("Once");
  });
});

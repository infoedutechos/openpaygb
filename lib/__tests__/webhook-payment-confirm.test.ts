import { describe, expect, it } from "vitest";
import { webhookAmountMatchesPayment } from "@/lib/webhook-payment-confirm";

describe("webhook-payment-confirm", () => {
  it("accepts matching UGX amounts within 1 UGX", () => {
    expect(webhookAmountMatchesPayment(500_000, 500_000, "UGX")).toBe(true);
    expect(webhookAmountMatchesPayment(500_000, 500_001, "UGX")).toBe(true);
  });

  it("rejects large mismatches", () => {
    expect(webhookAmountMatchesPayment(500_000, 100, "UGX")).toBe(false);
  });

  it("allows missing webhook amount for legacy providers", () => {
    expect(webhookAmountMatchesPayment(500_000, undefined, undefined)).toBe(true);
  });
});

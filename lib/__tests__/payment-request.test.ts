import { describe, expect, it } from "vitest";
import { paymentRequestPayPath, PAYMENT_REQUEST_TTL_MS } from "@/lib/payment-request";

describe("payment-request", () => {
  it("builds pay path with request and studentId", () => {
    expect(paymentRequestPayPath("makerere", "abc123", "stu1")).toBe(
      "/pay/makerere?request=abc123&studentId=stu1",
    );
  });

  it("uses 30-day TTL constant", () => {
    expect(PAYMENT_REQUEST_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

import { describe, expect, it } from "vitest";
import {
  checkoutPaymentErrorMessage,
  checkoutTopupHref,
  INSUFFICIENT_FUNDS_MESSAGE,
  isInsufficientFundsMessage,
} from "@/lib/checkout-insufficient-funds";

describe("checkout-insufficient-funds", () => {
  it("detects common insufficient funds phrases", () => {
    expect(isInsufficientFundsMessage("Insufficient funds in wallet")).toBe(true);
    expect(isInsufficientFundsMessage("Not enough TON to complete transfer")).toBe(true);
    expect(isInsufficientFundsMessage("Transaction declined: low balance")).toBe(true);
    expect(isInsufficientFundsMessage("Wallet action cancelled")).toBe(false);
    expect(isInsufficientFundsMessage(null)).toBe(false);
  });

  it("builds onramp href with return path", () => {
    expect(checkoutTopupHref("ton", "/pay/demo")).toBe("/dex/onramp?next=%2Fpay%2Fdemo");
    expect(checkoutTopupHref("momo")).toBe("/dex/onramp");
  });

  it("normalizes insufficient provider errors", () => {
    expect(checkoutPaymentErrorMessage(new Error("Not enough TON"), "fallback")).toBe(
      INSUFFICIENT_FUNDS_MESSAGE,
    );
    expect(checkoutPaymentErrorMessage(new Error("User rejected"), "fallback")).toBe("User rejected");
  });
});

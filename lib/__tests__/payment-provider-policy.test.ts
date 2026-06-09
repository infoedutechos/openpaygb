import { describe, expect, it } from "vitest";
import { isPaymentProviderEnabledByMaster } from "@/lib/payment-provider-policy-shared";

describe("payment-provider-policy", () => {
  it("defaults to enabled when key absent", () => {
    expect(isPaymentProviderEnabledByMaster("livepay", {})).toBe(true);
    expect(isPaymentProviderEnabledByMaster("livepay")).toBe(true);
  });

  it("respects explicit master false", () => {
    expect(isPaymentProviderEnabledByMaster("livepay", { livepay: false })).toBe(false);
  });

  it("requires explicit true when key present", () => {
    expect(isPaymentProviderEnabledByMaster("mbiyo", { mbiyo: true })).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { PLATFORM_POLICIES } from "@/lib/platform-policy-content";

describe("platform-policy-content", () => {
  it("defines all footer policy documents", () => {
    expect(Object.keys(PLATFORM_POLICIES).sort()).toEqual([
      "payment-providers",
      "privacy",
      "risk-disclosure",
      "terms",
    ]);
    expect(PLATFORM_POLICIES.terms.title).toBe("Platform Terms of Service");
    expect(PLATFORM_POLICIES.privacy.title).toBe("Platform Privacy Policy");
    expect(PLATFORM_POLICIES["risk-disclosure"].title).toBe("Risk Disclosure");
    expect(PLATFORM_POLICIES["payment-providers"].title).toBe("Payment Provider Policy");
  });
});

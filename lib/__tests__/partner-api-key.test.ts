import { describe, expect, it } from "vitest";
import {
  generatePartnerApiKey,
  hashPartnerApiKey,
  partnerKeyHasScope,
  PARTNER_KEY_PREFIX,
} from "@/lib/partner-api-key";

describe("partner-api-key", () => {
  it("generates keys with expected prefix", () => {
    const { plain, prefix, hash } = generatePartnerApiKey();
    expect(plain.startsWith(PARTNER_KEY_PREFIX)).toBe(true);
    expect(prefix.length).toBeGreaterThan(PARTNER_KEY_PREFIX.length);
    expect(hash).toBe(hashPartnerApiKey(plain));
  });

  it("checks scopes", () => {
    expect(partnerKeyHasScope(["payments:read"], "payments:read")).toBe(true);
    expect(partnerKeyHasScope(["payments:read"], "payments:create")).toBe(false);
  });
});

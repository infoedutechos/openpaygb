import { describe, expect, it } from "vitest";
import { isPlausibleTonAddress, normalizeTonAddress, tonAddressesMatch } from "@/lib/ton-address";

describe("ton-address", () => {
  it("accepts friendly mainnet addresses", () => {
    expect(
      isPlausibleTonAddress(
        "UQCS_placeholder_replace_with_real_wallet_000000000000000000000000",
      ),
    ).toBe(true);
  });

  it("rejects too short strings", () => {
    expect(isPlausibleTonAddress("UQshort")).toBe(false);
  });

  it("normalizes whitespace", () => {
    expect(normalizeTonAddress("  UQCS_placeholder_replace_with_real_wallet  ")).toBe(
      "UQCS_placeholder_replace_with_real_wallet",
    );
  });

  it("tonAddressesMatch is case-insensitive", () => {
    expect(tonAddressesMatch("EQabc123", "eqabc123")).toBe(true);
    expect(tonAddressesMatch("EQabc123", "UQabc123")).toBe(false);
  });
});

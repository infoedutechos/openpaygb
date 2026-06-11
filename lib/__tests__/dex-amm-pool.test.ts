import { describe, expect, it } from "vitest";
import { quoteAmmFromPool } from "@/lib/dex-amm-pool";

describe("dex-amm-pool", () => {
  it("quotes constant-product output with fee", () => {
    const q = quoteAmmFromPool({
      reserveOpgbUgx: 50_000_000,
      reserveCrypto: 125,
      inputOpgbUgx: 1_000_000,
    });
    expect(q).not.toBeNull();
    expect(q!.outputCrypto).toBeGreaterThan(0);
    expect(q!.outputCrypto).toBeLessThan(125);
    expect(q!.priceImpactBps).toBeGreaterThan(0);
  });
});

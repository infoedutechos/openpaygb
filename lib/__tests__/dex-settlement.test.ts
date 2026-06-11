import { describe, expect, it } from "vitest";
import { dexSettlementNextPath } from "@/lib/dex-settlement";

describe("dex-settlement", () => {
  it("routes TON to onramp", () => {
    expect(dexSettlementNextPath("TON")).toBe("/dex/onramp");
  });

  it("routes other assets to buy", () => {
    expect(dexSettlementNextPath("USDT")).toBe("/dex/buy");
  });
});

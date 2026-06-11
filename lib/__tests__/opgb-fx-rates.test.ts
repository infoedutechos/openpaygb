import { describe, expect, it } from "vitest";
import { ugxToCryptoAmount } from "@/lib/opgb-fx-rates";

describe("opgb-fx-rates", () => {
  it("converts UGX to crypto units", () => {
    const rates = {
      ugxPerTon: 400_000,
      ugxPerUsdt: 3_700,
      ugxPerBtc: 420_000_000,
      ugxPerEth: 14_000_000,
    };
    expect(ugxToCryptoAmount("ton", 400_000, rates)).toBe(1);
    expect(ugxToCryptoAmount("usdt", 3_700, rates)).toBe(1);
  });
});

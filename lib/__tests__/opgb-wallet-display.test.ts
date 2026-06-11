import { describe, expect, it } from "vitest";
import { buildOpgbWalletDisplayFromFx } from "@/lib/opgb-wallet-display";

describe("opgb-wallet-display", () => {
  it("Phase 2 FX basket from OPGB balance", () => {
    const view = buildOpgbWalletDisplayFromFx(25_000, {
      ugxPerTon: 400_000,
      ugxPerUsdt: 3_700,
      ugxPerBtc: 420_000_000,
      ugxPerEth: 14_000_000,
      source: "test",
      fetchedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(view.phase).toBe(4);
    expect(view.portfolioValueUgx).toBe(25_000);
    const opgb = view.balances.find((b) => b.currency === "opgb");
    expect(opgb?.amount).toBe(25_000);
    expect(opgb?.custodial).toBe(true);
    const ton = view.balances.find((b) => b.currency === "ton");
    expect(ton?.previewOnly).toBe(true);
    expect(ton?.amount).toBeCloseTo(0.0625, 4);
  });

  it("shows custodial crypto in portfolio", () => {
    const map = new Map<string, number>([["ton", 1.5]]);
    const view = buildOpgbWalletDisplayFromFx(
      0,
      {
        ugxPerTon: 400_000,
        ugxPerUsdt: 3_700,
        ugxPerBtc: 420_000_000,
        ugxPerEth: 14_000_000,
        source: "test",
        fetchedAt: "2026-01-01T00:00:00.000Z",
      },
      map,
    );
    const ton = view.balances.find((b) => b.currency === "ton");
    expect(ton?.custodial).toBe(true);
    expect(ton?.amount).toBe(1.5);
    expect(view.portfolioValueUgx).toBe(600_000);
  });
});

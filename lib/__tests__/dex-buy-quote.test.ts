import { describe, expect, it, vi } from "vitest";
import { quoteDexBuy } from "@/lib/dex-buy-quote";

vi.mock("@/lib/fx-live", () => ({
  getCachedLiveUgxPerTon: vi.fn(async () => ({
    ugxPerTon: 400_000,
    source: "test",
    fetchedAt: new Date("2026-01-01T00:00:00.000Z"),
  })),
}));

describe("dex-buy-quote", () => {
  it("returns 8-step summary fields for fiat buy", async () => {
    const quote = await quoteDexBuy("TON", 100_000);
    expect(quote).not.toBeNull();
    expect(quote!.fiatAmount).toBe(100_000);
    expect(quote!.feeUgx).toBe(1_500);
    expect(quote!.totalFiatUgx).toBe(101_500);
    expect(quote!.cryptoAmount).toBeGreaterThan(0);
    expect(quote!.opgbSettlementMinor).toBe(quote!.totalFiatUgx);
    expect(quote!.stepsReady).toBe(true);
  });
});

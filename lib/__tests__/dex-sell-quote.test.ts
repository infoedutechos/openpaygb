import { describe, expect, it, vi } from "vitest";
import { quoteDexSell } from "@/lib/dex-sell-quote";

vi.mock("@/lib/fx-live", () => ({
  getCachedLiveUgxPerTon: vi.fn(async () => ({
    ugxPerTon: 400_000,
    source: "test",
    fetchedAt: new Date("2026-01-01T00:00:00.000Z"),
  })),
}));

describe("dex-sell-quote", () => {
  it("returns fee and net settlement for crypto sell", async () => {
    const quote = await quoteDexSell("TON", 0.25);
    expect(quote).not.toBeNull();
    expect(quote!.grossUgx).toBe(100_000);
    expect(quote!.feeUgx).toBe(1_500);
    expect(quote!.settlementUgx).toBe(98_500);
    expect(quote!.stepsReady).toBe(true);
  });
});

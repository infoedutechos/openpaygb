import { describe, expect, it, vi } from "vitest";
import { quoteAmmSwap } from "@/lib/dex-amm-quote";

vi.mock("@/lib/dex-amm-pool", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dex-amm-pool")>();
  return {
    ...actual,
    ensureAmmPools: vi.fn(async () => {}),
    getAmmPool: vi.fn(async (pair: string) => ({
      id: "pool1",
      pair,
      reserveOpgbUgx: 50_000_000,
      reserveCrypto: pair === "OPGB_TON" ? 125 : 13_500,
      updatedAt: new Date(),
    })),
  };
});

describe("dex-amm-quote", () => {
  it("quotes OPGB to TON swap from pool reserves", async () => {
    const q = await quoteAmmSwap({ pair: "OPGB_TON", inputAmount: 400_000, direction: "exact_in" });
    expect(q?.outputAmount).toBeGreaterThan(0);
    expect(q?.status).toBe("quoted");
    expect(q?.executionPhase).toBe(3);
    expect(q?.feeBps).toBe(30);
  });
});

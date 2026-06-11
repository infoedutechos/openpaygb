import { describe, expect, it, vi } from "vitest";
import { quoteAmmSwap } from "@/lib/dex-amm-quote";

vi.mock("@/lib/opgb-fx-rates", () => ({
  getOpgbFxSnapshot: vi.fn(async () => ({
    ugxPerTon: 400_000,
    ugxPerUsdt: 3_700,
    ugxPerBtc: 420_000_000,
    ugxPerEth: 14_000_000,
    source: "test",
    fetchedAt: "2026-01-01T00:00:00.000Z",
  })),
}));

describe("dex-amm-quote", () => {
  it("quotes OPGB to TON swap (phase 3 preview)", async () => {
    const q = await quoteAmmSwap({ pair: "OPGB_TON", inputAmount: 400_000, direction: "exact_in" });
    expect(q?.outputAmount).toBe(1);
    expect(q?.status).toBe("quote_only");
    expect(q?.executionPhase).toBe(3);
  });
});

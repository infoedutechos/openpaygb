import { describe, expect, it, vi, beforeEach } from "vitest";
import { quoteConvert } from "@/lib/convert-quote";

vi.mock("@/lib/fx-live", () => ({
  getCachedLiveUgxPerTon: vi.fn(async () => ({
    ugxPerTon: 1_000_000,
    source: "test",
    fetchedAt: new Date("2026-01-01T00:00:00.000Z"),
  })),
}));

describe("convert-quote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("quotes UGX to TON", async () => {
    const q = await quoteConvert("ugx_to_ton", 1_000_000);
    expect(q?.outputAmount).toBe(1);
    expect(q?.direction).toBe("ugx_to_ton");
  });

  it("quotes TON to UGX", async () => {
    const q = await quoteConvert("ton_to_ugx", 2);
    expect(q?.outputAmount).toBe(2_000_000);
  });

  it("rejects non-positive amounts", async () => {
    expect(await quoteConvert("ton_to_ugx", 0)).toBeNull();
  });
});

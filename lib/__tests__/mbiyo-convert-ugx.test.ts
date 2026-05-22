import { afterEach, describe, expect, it, vi } from "vitest";
import { convertUgxToCurrency } from "@/lib/mbiyo/convert-ugx";

describe("convertUgxToCurrency", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passthrough when target is UGX", async () => {
    const n = await convertUgxToCurrency(602_000, "UGX");
    expect(n).toBe(602_000);
  });

  it("converts via USD cross from open.er-api shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ rates: { UGX: 3_800, XOF: 595 } }), { status: 200 }),
      ),
    );

    /** 380,000 UGX / 3800 ≈ $100 USD; $100 × 595 XOF/USD */
    const n = await convertUgxToCurrency(380_000, "XOF");
    expect(n).toBe(59_500);
  });
});

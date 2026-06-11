import { describe, expect, it } from "vitest";
import { buildOpgbWalletDisplay } from "@/lib/opgb-wallet-display";

describe("opgb-wallet-display", () => {
  it("shows live OPGB and Phase 2 preview lines", () => {
    const view = buildOpgbWalletDisplay(25_000);
    expect(view.phase).toBe(1);
    expect(view.peg.opgbPerUgx).toBe(1);
    const opgb = view.balances.find((b) => b.currency === "opgb");
    expect(opgb?.amount).toBe(25_000);
    expect(opgb?.previewOnly).toBe(false);
    const ton = view.balances.find((b) => b.currency === "ton");
    expect(ton?.previewOnly).toBe(true);
  });
});

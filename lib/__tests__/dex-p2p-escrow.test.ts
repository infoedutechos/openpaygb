import { describe, expect, it } from "vitest";
import { listAutonomousP2pOffers, p2pEscrowPolicy } from "@/lib/dex-p2p-escrow";

describe("dex-p2p-escrow", () => {
  it("lists demo autonomous offers", () => {
    const offers = listAutonomousP2pOffers();
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((o) => o.autonomous)).toBe(true);
  });

  it("documents phase 3 escrow policy", () => {
    const policy = p2pEscrowPolicy();
    expect(policy.phase).toBe(3);
    expect(policy.pending).toContain("escrow_wallet");
  });
});

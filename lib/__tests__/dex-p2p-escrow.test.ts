import { describe, expect, it } from "vitest";
import { p2pEscrowPolicy } from "@/lib/dex-p2p-escrow";

describe("dex-p2p-escrow", () => {
  it("documents phase 3 escrow policy with shipped features", () => {
    const policy = p2pEscrowPolicy();
    expect(policy.phase).toBe(3);
    expect(policy.shipped).toContain("escrow_hold");
    expect(policy.shipped).toContain("auto_release");
    expect(policy.shipped).toContain("dispute_escalation");
    expect(policy.shipped).toContain("master_dispute_resolve");
    expect(policy.pending).toContain("on_chain_release");
  });
});

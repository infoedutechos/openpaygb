import "server-only";

export type P2pOfferSide = "buy" | "sell";
export type P2pAsset = "TON" | "USDT";

export type P2pOffer = {
  id: string;
  side: P2pOfferSide;
  asset: P2pAsset;
  amount: number;
  priceUgxPerUnit: number;
  totalUgx: number;
  status: "open";
  autonomous: true;
  escrowPhase: 3;
};

/** Demo autonomous P2P book — Phase 3 wires escrow + release rules. */
export function listAutonomousP2pOffers(): P2pOffer[] {
  return [
    {
      id: "p2p-demo-1",
      side: "sell",
      asset: "TON",
      amount: 2.5,
      priceUgxPerUnit: 372_000,
      totalUgx: 930_000,
      status: "open",
      autonomous: true,
      escrowPhase: 3,
    },
    {
      id: "p2p-demo-2",
      side: "buy",
      asset: "USDT",
      amount: 100,
      priceUgxPerUnit: 3_720,
      totalUgx: 372_000,
      status: "open",
      autonomous: true,
      escrowPhase: 3,
    },
  ];
}

export function p2pEscrowPolicy() {
  return {
    phase: 3,
    autonomous: true,
    settlementAsset: "OPGB",
    peg: { opgbPerUgx: 1 },
    features: ["offer_book", "escrow_hold", "auto_release", "dispute_escalation"],
    shipped: ["demo_offer_book", "policy_api"],
    pending: ["escrow_wallet", "on_chain_release", "maker_taker_matching"],
  };
}

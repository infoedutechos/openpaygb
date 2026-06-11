import { NextResponse } from "next/server";
import { listAutonomousP2pOffers, p2pEscrowPolicy } from "@/lib/dex-p2p-escrow";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    return NextResponse.json({
      policy: p2pEscrowPolicy(),
      offers: listAutonomousP2pOffers(),
      note: "Autonomous P2P escrow execution ships in Phase 3 — offers are illustrative until escrow wallets are live.",
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/dex/p2p" });
  }
}

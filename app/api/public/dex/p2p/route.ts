import { NextResponse } from "next/server";
import { listOpenP2pOffers, p2pEscrowPolicy } from "@/lib/dex-p2p-escrow";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const offers = await listOpenP2pOffers();
    return NextResponse.json({
      policy: p2pEscrowPolicy(),
      offers: offers.map((o) => ({
        id: o.id,
        side: o.side,
        asset: o.asset,
        amount: o.amount,
        priceUgxPerUnit: o.priceUgxPerUnit,
        totalUgx: o.totalUgx,
        status: o.status,
        expiresAt: o.expiresAt.toISOString(),
      })),
      note: "Sign in as a student and POST /api/student/dex/p2p/escrow to hold OPGB in escrow for an open offer.",
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/dex/p2p" });
  }
}

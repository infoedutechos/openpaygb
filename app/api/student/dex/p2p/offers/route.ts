import { NextRequest, NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { createP2pOffer, type P2pAsset, type P2pOfferSide } from "@/lib/dex-p2p-escrow";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Sign in to post offers" }, { status: 401 });
    }

    const body = (await req.json()) as {
      side?: string;
      asset?: string;
      amount?: number;
      priceUgxPerUnit?: number;
    };

    const side = (body.side ?? "sell").toLowerCase() as P2pOfferSide;
    const asset = (body.asset ?? "TON").toUpperCase() as P2pAsset;
    const amount = Number(body.amount);
    const priceUgxPerUnit = Math.round(Number(body.priceUgxPerUnit));

    if (side !== "buy" && side !== "sell") {
      return NextResponse.json({ error: "side must be buy or sell" }, { status: 400 });
    }
    if (asset !== "TON" && asset !== "USDT") {
      return NextResponse.json({ error: "asset must be TON or USDT" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0 || priceUgxPerUnit <= 0) {
      return NextResponse.json({ error: "Invalid amount or price" }, { status: 400 });
    }

    const offer = await createP2pOffer({
      makerStudentId: session.sub,
      side,
      asset,
      amount,
      priceUgxPerUnit,
    });

    return NextResponse.json({ ok: true, offer });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/student/dex/p2p/offers" });
  }
}

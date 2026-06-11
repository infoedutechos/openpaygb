import { NextRequest, NextResponse } from "next/server";
import { processAutoReleaseEscrows } from "@/lib/dex-p2p-release";
import { settleQueuedDexBuyOrders } from "@/lib/dex-buy-settle";
import { ensureAmmPools } from "@/lib/dex-amm-pool";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAmmPools();
  const p2p = await processAutoReleaseEscrows();
  const buys = await settleQueuedDexBuyOrders();

  return NextResponse.json({
    ok: true,
    p2pAutoRelease: p2p,
    buySettlement: buys,
  });
}

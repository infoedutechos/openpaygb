import { NextRequest, NextResponse } from "next/server";
import { processAutoReleaseEscrows } from "@/lib/dex-p2p-release";
import { settleQueuedDexBuyOrders } from "@/lib/dex-buy-settle";
import { ensureAmmPools } from "@/lib/dex-amm-pool";
import { requireCronAuth } from "@/lib/production-secrets";

export async function GET(req: NextRequest) {
  const gate = requireCronAuth(req);
  if (!gate.ok) return gate.response;

  await ensureAmmPools();
  const p2p = await processAutoReleaseEscrows();
  const buys = await settleQueuedDexBuyOrders();

  return NextResponse.json({
    ok: true,
    p2pAutoRelease: p2p,
    buySettlement: buys,
  });
}

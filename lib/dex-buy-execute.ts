import "server-only";

import { prisma } from "@/lib/prisma";
import { quoteDexBuy, type DexBuyCrypto } from "@/lib/dex-buy-quote";
import { dexSettlementNextPath, dexSettlementNote } from "@/lib/dex-settlement";

export type DexBuyExecutionResult =
  | { ok: true; status: "queued"; referenceId: string; message: string; nextPath: string }
  | { ok: false; error: string; status: number };

/** Phase 2: validate quote and queue buy (full AMM settlement is Phase 3). */
export async function queueDexBuy(opts: {
  crypto: DexBuyCrypto;
  fiatAmountUgx: number;
}): Promise<DexBuyExecutionResult> {
  const quote = await quoteDexBuy(opts.crypto, opts.fiatAmountUgx);
  if (!quote) {
    return { ok: false, error: "Invalid buy request", status: 400 };
  }
  if (!quote.stepsReady) {
    return { ok: false, error: "Liquidity feed unavailable — try again shortly", status: 503 };
  }

  const referenceKey = `dexbuy:${opts.crypto}:${opts.fiatAmountUgx}:${Date.now()}`;
  const order = await prisma.dexBuyOrder.create({
    data: {
      crypto: opts.crypto,
      fiatAmountUgx: quote.fiatAmount,
      cryptoAmount: quote.cryptoAmount,
      feeUgx: quote.feeUgx,
      status: "queued",
      referenceKey,
    },
  });

  return {
    ok: true,
    status: "queued",
    referenceId: order.referenceKey,
    message: `${dexSettlementNote(opts.crypto)} Buy queued: ${quote.cryptoAmount} ${opts.crypto} for UGX ${quote.fiatAmount.toLocaleString()}.`,
    nextPath: dexSettlementNextPath(opts.crypto),
  };
}

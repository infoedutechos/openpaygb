import "server-only";

import { quoteDexBuy, type DexBuyCrypto } from "@/lib/dex-buy-quote";

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

  const referenceId = `dexbuy:${opts.crypto}:${Date.now()}`;
  return {
    ok: true,
    status: "queued",
    referenceId,
    message: `Buy queued: ${quote.cryptoAmount} ${opts.crypto} for UGX ${quote.fiatAmount.toLocaleString()}. Settlement books through OPGB.`,
    nextPath: "/dex/onramp",
  };
}

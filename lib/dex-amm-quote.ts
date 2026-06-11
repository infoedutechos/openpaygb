import "server-only";

import { ensureAmmPools, getAmmPool, quoteAmmFromPool } from "@/lib/dex-amm-pool";

export type AmmPair = "OPGB_TON" | "OPGB_USDT";

export type AmmQuote = {
  pair: AmmPair;
  inputAsset: string;
  outputAsset: string;
  inputAmount: number;
  outputAmount: number;
  priceImpactBps: number;
  poolLiquidityUgx: number;
  executionPhase: 3;
  status: "quoted";
  feeBps: number;
};

export async function quoteAmmSwap(opts: {
  pair: AmmPair;
  inputAmount: number;
  direction: "exact_in";
}): Promise<AmmQuote | null> {
  if (!Number.isFinite(opts.inputAmount) || opts.inputAmount <= 0) return null;

  await ensureAmmPools();
  const pool = await getAmmPool(opts.pair);
  if (!pool) return null;

  const quote = quoteAmmFromPool({
    reserveOpgbUgx: pool.reserveOpgbUgx,
    reserveCrypto: pool.reserveCrypto,
    inputOpgbUgx: opts.inputAmount,
  });
  if (!quote) return null;

  const outputAsset = opts.pair === "OPGB_TON" ? "TON" : "USDT";

  return {
    pair: opts.pair,
    inputAsset: "OPGB",
    outputAsset,
    inputAmount: quote.inputOpgbUgx,
    outputAmount: quote.outputCrypto,
    priceImpactBps: quote.priceImpactBps,
    poolLiquidityUgx: quote.poolLiquidityUgx,
    executionPhase: 3,
    status: "quoted",
    feeBps: quote.feeBps,
  };
}

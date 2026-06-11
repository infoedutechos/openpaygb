import "server-only";

import { getOpgbFxSnapshot } from "@/lib/opgb-fx-rates";

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
  status: "quote_only";
};

const DEMO_POOL_LIQUIDITY_UGX = 50_000_000;

export async function quoteAmmSwap(opts: {
  pair: AmmPair;
  inputAmount: number;
  direction: "exact_in";
}): Promise<AmmQuote | null> {
  if (!Number.isFinite(opts.inputAmount) || opts.inputAmount <= 0) return null;
  const fx = await getOpgbFxSnapshot();

  if (opts.pair === "OPGB_TON") {
    const outputTon = opts.inputAmount / fx.ugxPerTon;
    return {
      pair: opts.pair,
      inputAsset: "OPGB",
      outputAsset: "TON",
      inputAmount: opts.inputAmount,
      outputAmount: Math.round(outputTon * 1e9) / 1e9,
      priceImpactBps: Math.min(50, Math.round((opts.inputAmount / DEMO_POOL_LIQUIDITY_UGX) * 10_000)),
      poolLiquidityUgx: DEMO_POOL_LIQUIDITY_UGX,
      executionPhase: 3,
      status: "quote_only",
    };
  }

  const outputUsdt = opts.inputAmount / fx.ugxPerUsdt;
  return {
    pair: opts.pair,
    inputAsset: "OPGB",
    outputAsset: "USDT",
    inputAmount: opts.inputAmount,
    outputAmount: Math.round(outputUsdt * 1e6) / 1e6,
    priceImpactBps: Math.min(50, Math.round((opts.inputAmount / DEMO_POOL_LIQUIDITY_UGX) * 10_000)),
    poolLiquidityUgx: DEMO_POOL_LIQUIDITY_UGX,
    executionPhase: 3,
    status: "quote_only",
  };
}

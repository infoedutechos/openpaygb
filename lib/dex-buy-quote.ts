import "server-only";

import { getOpgbFxSnapshot, ugxToCryptoAmount } from "@/lib/opgb-fx-rates";
import { ugxToOpgbMinor } from "@/lib/opgb-peg";

export const DEX_BUY_CRYPTO_ASSETS = ["TON", "USDT", "BTC", "ETH"] as const;
export type DexBuyCrypto = (typeof DEX_BUY_CRYPTO_ASSETS)[number];

/** Platform fee for fiat→crypto buy (Phase 1 flat bps on UGX spend). */
export const DEX_BUY_FEE_BPS = 150; // 1.5%

export type DexBuyQuote = {
  crypto: DexBuyCrypto;
  fiatCurrency: "UGX";
  fiatAmount: number;
  feeUgx: number;
  totalFiatUgx: number;
  cryptoAmount: number;
  opgbSettlementMinor: number;
  ugxPerTon: number | null;
  source: string;
  fetchedAt: string;
  stepsReady: boolean;
};

export async function quoteDexBuy(crypto: DexBuyCrypto, fiatAmountUgx: number): Promise<DexBuyQuote | null> {
  if (!DEX_BUY_CRYPTO_ASSETS.includes(crypto)) return null;
  if (!Number.isFinite(fiatAmountUgx) || fiatAmountUgx <= 0) return null;

  const fx = await getOpgbFxSnapshot();
  const fiatAmount = Math.round(fiatAmountUgx);
  const feeUgx = Math.ceil((fiatAmount * DEX_BUY_FEE_BPS) / 10_000);
  const totalFiatUgx = fiatAmount + feeUgx;
  const cryptoKey = crypto.toLowerCase() as "ton" | "usdt" | "btc" | "eth";
  const cryptoAmount = ugxToCryptoAmount(cryptoKey, fiatAmount, fx);

  return {
    crypto,
    fiatCurrency: "UGX",
    fiatAmount,
    feeUgx,
    totalFiatUgx,
    cryptoAmount,
    opgbSettlementMinor: ugxToOpgbMinor(totalFiatUgx),
    ugxPerTon: fx.ugxPerTon,
    source: fx.source,
    fetchedAt: fx.fetchedAt,
    stepsReady: fx.ugxPerTon > 0,
  };
}

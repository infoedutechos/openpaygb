import "server-only";

import { getCachedLiveUgxPerTon } from "@/lib/fx-live";
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

function cryptoAmountFromUgx(crypto: DexBuyCrypto, netUgx: number, ugxPerTon: number): number {
  if (netUgx <= 0) return 0;
  switch (crypto) {
    case "TON":
      return Math.round((netUgx / ugxPerTon) * 1e9) / 1e9;
    case "USDT":
      return Math.round((netUgx / 3700) * 1e6) / 1e6;
    case "BTC":
      return Math.round((netUgx / 420_000_000) * 1e8) / 1e8;
    case "ETH":
      return Math.round((netUgx / 14_000_000) * 1e6) / 1e6;
    default:
      return 0;
  }
}

export async function quoteDexBuy(crypto: DexBuyCrypto, fiatAmountUgx: number): Promise<DexBuyQuote | null> {
  if (!DEX_BUY_CRYPTO_ASSETS.includes(crypto)) return null;
  if (!Number.isFinite(fiatAmountUgx) || fiatAmountUgx <= 0) return null;

  const fx = await getCachedLiveUgxPerTon();
  const ugxPerTon = fx?.ugxPerTon ?? null;
  const feeUgx = Math.ceil((fiatAmountUgx * DEX_BUY_FEE_BPS) / 10_000);
  const netUgx = Math.max(0, fiatAmountUgx - feeUgx);

  const cryptoAmount =
    crypto === "TON" && ugxPerTon && ugxPerTon > 0
      ? cryptoAmountFromUgx(crypto, netUgx, ugxPerTon)
      : cryptoAmountFromUgx(crypto, netUgx, ugxPerTon ?? 370_000);

  return {
    crypto,
    fiatCurrency: "UGX",
    fiatAmount: Math.round(fiatAmountUgx),
    feeUgx,
    totalFiatUgx: Math.round(fiatAmountUgx),
    cryptoAmount,
    opgbSettlementMinor: ugxToOpgbMinor(netUgx),
    ugxPerTon,
    source: fx?.source ?? "static-fallback",
    fetchedAt: (fx?.fetchedAt ?? new Date()).toISOString(),
    stepsReady: Boolean(ugxPerTon && ugxPerTon > 0),
  };
}

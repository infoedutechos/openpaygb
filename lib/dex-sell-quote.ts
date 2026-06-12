import "server-only";

import { DEX_BUY_CRYPTO_ASSETS, type DexBuyCrypto } from "@/lib/dex-buy-quote";
import { getOpgbFxSnapshot, type OpgbFxSnapshot } from "@/lib/opgb-fx-rates";

export { DEX_BUY_CRYPTO_ASSETS as DEX_SELL_CRYPTO_ASSETS };
export type DexSellCrypto = DexBuyCrypto;

/** Platform fee for crypto→fiat sell (same bps as buy). */
export const DEX_SELL_FEE_BPS = 150;

export type DexSellQuote = {
  crypto: DexSellCrypto;
  cryptoAmount: number;
  grossUgx: number;
  feeUgx: number;
  settlementUgx: number;
  ugxPerTon: number | null;
  source: string;
  fetchedAt: string;
  stepsReady: boolean;
};

function cryptoToUgx(crypto: DexSellCrypto, amount: number, fx: OpgbFxSnapshot): number {
  if (amount <= 0) return 0;
  switch (crypto) {
    case "TON":
      return Math.round(amount * fx.ugxPerTon);
    case "USDT":
      return Math.round(amount * fx.ugxPerUsdt);
    case "BTC":
      return Math.round(amount * fx.ugxPerBtc);
    case "ETH":
      return Math.round(amount * fx.ugxPerEth);
    default:
      return 0;
  }
}

export async function quoteDexSell(crypto: DexSellCrypto, cryptoAmount: number): Promise<DexSellQuote | null> {
  if (!DEX_BUY_CRYPTO_ASSETS.includes(crypto)) return null;
  if (!Number.isFinite(cryptoAmount) || cryptoAmount <= 0) return null;

  const fx = await getOpgbFxSnapshot();
  const grossUgx = cryptoToUgx(crypto, cryptoAmount, fx);
  if (grossUgx <= 0) return null;

  const feeUgx = Math.ceil((grossUgx * DEX_SELL_FEE_BPS) / 10_000);
  const settlementUgx = Math.max(0, grossUgx - feeUgx);

  return {
    crypto,
    cryptoAmount,
    grossUgx,
    feeUgx,
    settlementUgx,
    ugxPerTon: fx.ugxPerTon,
    source: fx.source,
    fetchedAt: fx.fetchedAt,
    stepsReady: fx.ugxPerTon > 0,
  };
}

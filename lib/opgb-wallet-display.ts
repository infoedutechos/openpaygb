import { OPGB_DISPLAY_CURRENCIES, opgbMinorToUgx } from "@/lib/opgb-peg";
import { getOpgbFxSnapshot, ugxToCryptoAmount, type OpgbFxSnapshot } from "@/lib/opgb-fx-rates";
import type { OpgbCryptoAsset } from "@/lib/opgb-asset-balance";

export type OpgbBalanceLine = {
  currency: string;
  amount: number;
  unit: string;
  /** True when amount is an FX quote from OPGB settlement balance (not a separate custodial wallet). */
  quotedFromOpgb: boolean;
  previewOnly: boolean;
  /** True when amount is a real custodial crypto balance. */
  custodial: boolean;
};

export function buildOpgbWalletDisplayFromFx(
  opgbBalanceMinor: number,
  fx: OpgbFxSnapshot,
  cryptoBalances?: Map<string, number>,
): {
  peg: { opgbPerUgx: number };
  phase: number;
  portfolioValueUgx: number;
  fx: OpgbFxSnapshot;
  balances: OpgbBalanceLine[];
} {
  const opgbUgx = opgbMinorToUgx(opgbBalanceMinor);
  let portfolioValueUgx = opgbUgx;

  const balances: OpgbBalanceLine[] = OPGB_DISPLAY_CURRENCIES.map((currency) => {
    if (currency === "opgb") {
      return {
        currency,
        amount: opgbUgx,
        unit: "OPGB",
        quotedFromOpgb: false,
        previewOnly: false,
        custodial: true,
      };
    }
    if (currency === "momo") {
      return {
        currency,
        amount: opgbUgx,
        unit: "UGX",
        quotedFromOpgb: true,
        previewOnly: false,
        custodial: false,
      };
    }

    const custodialAmount = cryptoBalances?.get(currency) ?? 0;
    if (custodialAmount > 0) {
      const ugxPerMap = {
        ton: fx.ugxPerTon,
        usdt: fx.ugxPerUsdt,
        btc: fx.ugxPerBtc,
        eth: fx.ugxPerEth,
      } as const;
      const ugxPer = ugxPerMap[currency as keyof typeof ugxPerMap] ?? 0;
      const ugxValue = Math.round(custodialAmount * ugxPer);
      portfolioValueUgx += ugxValue;
      return {
        currency,
        amount: custodialAmount,
        unit: currency.toUpperCase(),
        quotedFromOpgb: false,
        previewOnly: false,
        custodial: true,
      };
    }

    const amount = ugxToCryptoAmount(currency as OpgbCryptoAsset, opgbUgx, fx);
    return {
      currency,
      amount,
      unit: currency.toUpperCase(),
      quotedFromOpgb: true,
      previewOnly: true,
      custodial: false,
    };
  });

  return {
    peg: { opgbPerUgx: 1 },
    phase: 4,
    portfolioValueUgx,
    fx,
    balances,
  };
}

/** Phase 4: real crypto custody + OPGB settlement + FX preview lines. */
export async function buildOpgbWalletDisplay(
  opgbBalanceMinor: number,
  cryptoBalances?: Map<string, number>,
) {
  const fx = await getOpgbFxSnapshot();
  return buildOpgbWalletDisplayFromFx(opgbBalanceMinor, fx, cryptoBalances);
}

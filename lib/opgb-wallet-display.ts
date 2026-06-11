import { OPGB_DISPLAY_CURRENCIES, opgbMinorToUgx } from "@/lib/opgb-peg";
import { getOpgbFxSnapshot, ugxToCryptoAmount, type OpgbFxSnapshot } from "@/lib/opgb-fx-rates";

export type OpgbBalanceLine = {
  currency: string;
  amount: number;
  unit: string;
  /** True when amount is an FX quote from OPGB settlement balance (not a separate custodial wallet). */
  quotedFromOpgb: boolean;
  previewOnly: boolean;
};

export function buildOpgbWalletDisplayFromFx(
  opgbBalanceMinor: number,
  fx: OpgbFxSnapshot,
): {
  peg: { opgbPerUgx: number };
  phase: 2;
  portfolioValueUgx: number;
  fx: OpgbFxSnapshot;
  balances: OpgbBalanceLine[];
} {
  const opgbUgx = opgbMinorToUgx(opgbBalanceMinor);
  const balances: OpgbBalanceLine[] = OPGB_DISPLAY_CURRENCIES.map((currency) => {
    if (currency === "opgb") {
      return { currency, amount: opgbUgx, unit: "OPGB", quotedFromOpgb: false, previewOnly: false };
    }
    if (currency === "momo") {
      return { currency, amount: opgbUgx, unit: "UGX", quotedFromOpgb: true, previewOnly: false };
    }
    const amount = ugxToCryptoAmount(currency, opgbUgx, fx);
    return {
      currency,
      amount,
      unit: currency.toUpperCase(),
      quotedFromOpgb: true,
      previewOnly: false,
    };
  });

  return {
    peg: { opgbPerUgx: 1 },
    phase: 2,
    portfolioValueUgx: opgbUgx,
    fx,
    balances,
  };
}

/** Phase 2: FX-quoted multi-currency basket from OPGB settlement balance. */
export async function buildOpgbWalletDisplay(opgbBalanceMinor: number) {
  const fx = await getOpgbFxSnapshot();
  return buildOpgbWalletDisplayFromFx(opgbBalanceMinor, fx);
}

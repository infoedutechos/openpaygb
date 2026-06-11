import { OPGB_DISPLAY_CURRENCIES, opgbMinorToUgx } from "@/lib/opgb-peg";

export type OpgbBalanceLine = {
  currency: string;
  amount: number;
  unit: string;
  /** Phase 2 preview — not a live on-chain / MoMo balance yet. */
  previewOnly: boolean;
};

/** Phase 1: OPGB is live; other basket lines are placeholders until Phase 2 FX wallets. */
export function buildOpgbWalletDisplay(opgbBalanceMinor: number): {
  peg: { opgbPerUgx: number };
  phase: 1 | 2;
  balances: OpgbBalanceLine[];
} {
  const opgbUgx = opgbMinorToUgx(opgbBalanceMinor);
  const balances: OpgbBalanceLine[] = OPGB_DISPLAY_CURRENCIES.map((currency) => {
    if (currency === "opgb") {
      return { currency, amount: opgbUgx, unit: "OPGB", previewOnly: false };
    }
    if (currency === "momo") {
      return { currency, amount: 0, unit: "UGX", previewOnly: true };
    }
    return { currency, amount: 0, unit: currency.toUpperCase(), previewOnly: true };
  });

  return {
    peg: { opgbPerUgx: 1 },
    phase: 1,
    balances,
  };
}

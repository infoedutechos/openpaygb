import "server-only";

import { getCachedLiveUgxPerTon } from "@/lib/fx-live";

/** Static UGX per unit fallbacks when live feeds are unavailable (Phase 2 basket display). */
export const OPGB_FX_FALLBACK_UGX: Record<string, number> = {
  ton: 370_000,
  usdt: 3_700,
  btc: 420_000_000,
  eth: 14_000_000,
};

export type OpgbFxSnapshot = {
  ugxPerTon: number;
  ugxPerUsdt: number;
  ugxPerBtc: number;
  ugxPerEth: number;
  source: string;
  fetchedAt: string;
};

export async function getOpgbFxSnapshot(): Promise<OpgbFxSnapshot> {
  const fx = await getCachedLiveUgxPerTon();
  const ugxPerTon = fx?.ugxPerTon && fx.ugxPerTon > 0 ? fx.ugxPerTon : OPGB_FX_FALLBACK_UGX.ton;
  return {
    ugxPerTon,
    ugxPerUsdt: OPGB_FX_FALLBACK_UGX.usdt,
    ugxPerBtc: OPGB_FX_FALLBACK_UGX.btc,
    ugxPerEth: OPGB_FX_FALLBACK_UGX.eth,
    source: fx?.source ?? "static-fallback",
    fetchedAt: (fx?.fetchedAt ?? new Date()).toISOString(),
  };
}

export function ugxToCryptoAmount(
  currency: "ton" | "usdt" | "btc" | "eth",
  ugx: number,
  rates: Pick<OpgbFxSnapshot, "ugxPerTon" | "ugxPerUsdt" | "ugxPerBtc" | "ugxPerEth">,
): number {
  if (ugx <= 0) return 0;
  switch (currency) {
    case "ton":
      return Math.round((ugx / rates.ugxPerTon) * 1e9) / 1e9;
    case "usdt":
      return Math.round((ugx / rates.ugxPerUsdt) * 1e6) / 1e6;
    case "btc":
      return Math.round((ugx / rates.ugxPerBtc) * 1e8) / 1e8;
    case "eth":
      return Math.round((ugx / rates.ugxPerEth) * 1e6) / 1e6;
    default:
      return 0;
  }
}

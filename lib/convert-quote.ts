import "server-only";

import { getCachedLiveUgxPerTon } from "@/lib/fx-live";

export type ConvertDirection = "ugx_to_ton" | "ton_to_ugx";

export type ConvertQuote = {
  direction: ConvertDirection;
  inputAmount: number;
  outputAmount: number;
  ugxPerTon: number;
  source: string;
  fetchedAt: string;
};

export async function quoteConvert(
  direction: ConvertDirection,
  amount: number,
): Promise<ConvertQuote | null> {
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const fx = await getCachedLiveUgxPerTon();
  if (!fx || fx.ugxPerTon <= 0) return null;

  const outputAmount =
    direction === "ugx_to_ton"
      ? Math.round((amount / fx.ugxPerTon) * 1e9) / 1e9
      : Math.round(amount * fx.ugxPerTon);

  return {
    direction,
    inputAmount: amount,
    outputAmount,
    ugxPerTon: fx.ugxPerTon,
    source: fx.source,
    fetchedAt: fx.fetchedAt.toISOString(),
  };
}

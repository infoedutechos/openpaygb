/** Convert a UGX tuition total to MbiyoPay settlement currency (XOF, GHS, …). */

type ErApiLatest = { rates?: Record<string, number> };

async function fetchUsdRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as ErApiLatest;
    return j.rates ?? null;
  } catch {
    return null;
  }
}

/**
 * Convert integer UGX (tuition quote) to target ISO currency for mobile-money collect.
 * Rounds up to 2 decimals so payin meets provider minimums.
 */
export async function convertUgxToCurrency(ugxAmount: number, targetCurrency: string): Promise<number> {
  const target = targetCurrency.toUpperCase();
  if (target === "UGX") return Math.max(1, Math.ceil(ugxAmount));

  const rates = await fetchUsdRates();
  if (!rates?.UGX) {
    throw new Error("Could not load UGX exchange rates for mobile-money conversion");
  }
  const targetPerUsd = rates[target];
  if (typeof targetPerUsd !== "number" || targetPerUsd <= 0) {
    throw new Error(`Exchange rate not available for ${target}`);
  }

  const usd = ugxAmount / rates.UGX;
  const local = usd * targetPerUsd;
  const rounded = Math.ceil(local * 100) / 100;
  return Math.max(0.01, rounded);
}

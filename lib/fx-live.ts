/**
 * Live TON → UGX from multiple public providers (parallel fetch + median when several succeed).
 */

import { tonApiOrigin } from "@/lib/ton-network";

export type LiveFxResult = {
  ugxPerTon: number;
  source: string;
  fetchedAt: Date;
};

const COINGECKO_TON_ID = "the-open-network";

let cache: LiveFxResult | null = null;

function cacheTtlMs(): number {
  const sec = Number(process.env.FX_CACHE_TTL_SECONDS ?? "300");
  return Math.max(60, sec) * 1000;
}

function liveFxEnabled(): boolean {
  return process.env.FX_LIVE_ENABLED !== "false";
}

function roundUgxPerTon(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return roundUgxPerTon((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return roundUgxPerTon(sorted[mid]!);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const headers: HeadersInit = { Accept: "application/json", ...(init?.headers ?? {}) };
    const res = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** USD → UGX (how many UGX per 1 USD). */
async function fetchUgxPerUsd(): Promise<number | null> {
  const er = await fetchJson<{ rates?: { UGX?: number } }>("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 300 },
  });
  if (typeof er?.rates?.UGX === "number" && er.rates.UGX > 0) return er.rates.UGX;

  const fr = await fetchJson<{ rates?: { UGX?: number } }>(
    "https://api.frankfurter.app/latest?from=USD&to=UGX",
    { next: { revalidate: 300 } },
  );
  if (typeof fr?.rates?.UGX === "number" && fr.rates.UGX > 0) return fr.rates.UGX;

  return null;
}

async function providerCoinGeckoDirect(): Promise<LiveFxResult | null> {
  const j = await fetchJson<Record<string, { ugx?: number }>>(
    `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_TON_ID}&vs_currencies=ugx`,
    { next: { revalidate: 300 } },
  );
  const ugx = j?.[COINGECKO_TON_ID]?.ugx;
  const ugxPerTon = typeof ugx === "number" && ugx > 0 ? roundUgxPerTon(ugx) : 0;
  return ugxPerTon > 0 ? { ugxPerTon, source: "coingecko", fetchedAt: new Date() } : null;
}

async function providerCryptoCompareDirect(): Promise<LiveFxResult | null> {
  const j = await fetchJson<{ UGX?: number }>(
    "https://min-api.cryptocompare.com/data/price?fsym=TON&tsyms=UGX",
    { next: { revalidate: 300 } },
  );
  const ugx = j?.UGX;
  const ugxPerTon = typeof ugx === "number" && ugx > 0 ? roundUgxPerTon(ugx) : 0;
  return ugxPerTon > 0 ? { ugxPerTon, source: "cryptocompare", fetchedAt: new Date() } : null;
}

async function providerTonApiDirect(): Promise<LiveFxResult | null> {
  const origin = tonApiOrigin();
  const headers: HeadersInit = { Accept: "application/json" };
  const key = process.env.TONAPI_KEY?.trim();
  if (key) (headers as Record<string, string>).Authorization = `Bearer ${key}`;

  const j = await fetchJson<{
    rates?: Record<string, { prices?: { UGX?: number } }>;
  }>(`${origin}/v2/rates?tokens=ton&currencies=ugx`, { headers, next: { revalidate: 300 } });

  const tonEntry = j?.rates?.TON ?? j?.rates?.ton;
  const ugx = tonEntry?.prices?.UGX;
  const ugxPerTon = typeof ugx === "number" && ugx > 0 ? roundUgxPerTon(ugx) : 0;
  return ugxPerTon > 0 ? { ugxPerTon, source: "tonapi", fetchedAt: new Date() } : null;
}

async function crossFromTonUsd(
  tonUsd: number,
  source: string,
): Promise<LiveFxResult | null> {
  const ugxPerUsd = await fetchUgxPerUsd();
  if (!ugxPerUsd || tonUsd <= 0) return null;
  const ugxPerTon = roundUgxPerTon(tonUsd * ugxPerUsd);
  return ugxPerTon > 0 ? { ugxPerTon, source, fetchedAt: new Date() } : null;
}

async function providerCoinGeckoCross(): Promise<LiveFxResult | null> {
  const j = await fetchJson<Record<string, { usd?: number }>>(
    `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_TON_ID}&vs_currencies=usd`,
    { next: { revalidate: 300 } },
  );
  const tonUsd = j?.[COINGECKO_TON_ID]?.usd;
  if (typeof tonUsd !== "number" || tonUsd <= 0) return null;
  return crossFromTonUsd(tonUsd, "coingecko_usd_ugx");
}

async function providerCryptoCompareCross(): Promise<LiveFxResult | null> {
  const j = await fetchJson<{ USD?: number }>(
    "https://min-api.cryptocompare.com/data/price?fsym=TON&tsyms=USD",
    { next: { revalidate: 300 } },
  );
  const tonUsd = j?.USD;
  if (typeof tonUsd !== "number" || tonUsd <= 0) return null;
  return crossFromTonUsd(tonUsd, "cryptocompare_usd_ugx");
}

async function providerBinanceCross(): Promise<LiveFxResult | null> {
  const j = await fetchJson<{ price?: string }>(
    "https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT",
    { next: { revalidate: 300 } },
  );
  const tonUsd = j?.price ? Number(j.price) : NaN;
  if (!Number.isFinite(tonUsd) || tonUsd <= 0) return null;
  return crossFromTonUsd(tonUsd, "binance_usdt_ugx");
}

async function providerTonApiCross(): Promise<LiveFxResult | null> {
  const origin = tonApiOrigin();
  const headers: HeadersInit = { Accept: "application/json" };
  const key = process.env.TONAPI_KEY?.trim();
  if (key) (headers as Record<string, string>).Authorization = `Bearer ${key}`;

  const j = await fetchJson<{
    rates?: Record<string, { prices?: { USD?: number } }>;
  }>(`${origin}/v2/rates?tokens=ton&currencies=usd`, { headers, next: { revalidate: 300 } });

  const tonEntry = j?.rates?.TON ?? j?.rates?.ton;
  const tonUsd = tonEntry?.prices?.USD;
  if (typeof tonUsd !== "number" || tonUsd <= 0) return null;
  return crossFromTonUsd(tonUsd, "tonapi_usd_ugx");
}

type ProviderFn = () => Promise<LiveFxResult | null>;

const PROVIDERS: ProviderFn[] = [
  providerCoinGeckoDirect,
  providerCryptoCompareDirect,
  providerTonApiDirect,
  providerBinanceCross,
  providerCoinGeckoCross,
  providerCryptoCompareCross,
  providerTonApiCross,
];

function combineProviderResults(results: LiveFxResult[]): LiveFxResult | null {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0]!;

  const rates = results.map((r) => r.ugxPerTon);
  const med = median(rates);
  const withinBand = results.filter((r) => Math.abs(r.ugxPerTon - med) / med <= 0.08);
  const pool = withinBand.length >= 2 ? withinBand : results;
  const ugxPerTon = median(pool.map((r) => r.ugxPerTon));

  return {
    ugxPerTon,
    source: `market_median_${pool.length}`,
    fetchedAt: new Date(),
  };
}

export type LiveFxProviderQuote = {
  source: string;
  ugxPerTon: number;
};

export type LiveFxBreakdown = {
  providers: LiveFxProviderQuote[];
  combined: LiveFxResult | null;
};

/** All provider quotes + median combine (no cache). */
export async function fetchLiveFxBreakdown(): Promise<LiveFxBreakdown> {
  if (!liveFxEnabled()) return { providers: [], combined: null };

  const settled = await Promise.allSettled(PROVIDERS.map((fn) => fn()));
  const ok: LiveFxResult[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled" && s.value && s.value.ugxPerTon > 0) {
      ok.push(s.value);
    }
  }
  return {
    providers: ok.map((r) => ({ source: r.source, ugxPerTon: r.ugxPerTon })),
    combined: combineProviderResults(ok),
  };
}

/** Fetch live 1 TON = ? UGX (no cache). Queries providers in parallel. */
export async function fetchLiveUgxPerTon(): Promise<LiveFxResult | null> {
  const { combined } = await fetchLiveFxBreakdown();
  return combined;
}

/** Cached live rate for checkout quotes (shared across orgs). */
export async function getCachedLiveUgxPerTon(): Promise<LiveFxResult | null> {
  if (!liveFxEnabled()) return null;
  const now = Date.now();
  if (cache && now - cache.fetchedAt.getTime() < cacheTtlMs()) {
    return cache;
  }
  const live = await fetchLiveUgxPerTon();
  if (live) cache = live;
  return live;
}

/** Test helper */
export function clearLiveFxCache(): void {
  cache = null;
}

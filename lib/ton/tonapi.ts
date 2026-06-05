import { defaultTonWallet } from "@/lib/constants";
import { tonApiOrigin } from "@/lib/ton-network";

type TonApiTx = Record<string, unknown>;

type FetchResult =
  | { ok: true; transactions: TonApiTx[] }
  | { ok: false; error: string };

/** Recent transactions involving a settlement wallet (TonAPI). */
export async function fetchAccountTransactionsRecent(
  address: string,
  limit = 80,
): Promise<FetchResult> {
  const trimmed = address.trim();
  if (!trimmed || trimmed.includes("placeholder")) {
    return { ok: false, error: "Invalid settlement wallet address" };
  }

  const origin = tonApiOrigin();
  const url = `${origin}/v2/blockchain/accounts/${encodeURIComponent(trimmed)}/transactions?limit=${limit}`;
  const headers: HeadersInit = { Accept: "application/json" };
  const key = process.env.TONAPI_KEY?.trim();
  if (key) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${key}`;
  }

  const res = await fetch(url, { headers, next: { revalidate: 0 } });
  if (!res.ok) {
    return { ok: false, error: `TonAPI ${res.status} for ${trimmed.slice(0, 8)}…` };
  }
  const j = (await res.json()) as { transactions?: TonApiTx[] };
  const transactions = Array.isArray(j.transactions) ? j.transactions : [];
  return { ok: true, transactions };
}

/** Default env settlement wallet (legacy single-wallet scan). */
export async function fetchDefaultWalletTransactionsRecent(limit = 80): Promise<FetchResult> {
  const address = defaultTonWallet().trim();
  if (!address || address.includes("placeholder")) {
    return { ok: false, error: "ODELHUB_TON_WALLET_ADDRESS is not configured" };
  }
  return fetchAccountTransactionsRecent(address, limit);
}

export function txIncomingNano(tx: TonApiTx): bigint | null {
  const im = tx.in_msg;
  if (!im || typeof im !== "object") return null;
  const v = (im as Record<string, unknown>).value;
  if (v === undefined || v === null) return null;
  try {
    return BigInt(String(v));
  } catch {
    return null;
  }
}

export function txUtimeMs(tx: TonApiTx): number {
  const u = tx.utime;
  return typeof u === "number" ? u * 1000 : 0;
}

export function txHash(tx: TonApiTx): string | null {
  const h = tx.hash;
  return typeof h === "string" ? h : null;
}

/** Detect `ref:<paymentObjectId>` anywhere in the transaction JSON (comment / decoded fields). */
export function txReferencesPayment(tx: TonApiTx, paymentId: string): boolean {
  return txReferencesMarker(tx, `ref:${paymentId}`);
}

/** Detect an arbitrary memo marker in transaction JSON (TON comment / payload). */
export function txReferencesMarker(tx: TonApiTx, marker: string): boolean {
  const m = marker.trim();
  if (!m) return false;
  try {
    return JSON.stringify(tx).includes(m);
  } catch {
    return false;
  }
}

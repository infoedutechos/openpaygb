import type { TonChain } from "./ton-network";
import { tonChainFromEnv } from "./ton-network";

/** @deprecated Use `TonChain` from `@/lib/ton-network`. */
export type TonPayClientChain = TonChain;

export type TonPayClientOptions = {
  chain: TonChain;
  apiKey?: string;
};

/**
 * Client-side TON Pay options (browser). Prefer dashboard keys only via `NEXT_PUBLIC_*` when necessary.
 */
export function getClientTonPayOptions(): TonPayClientOptions {
  const chain = tonChainFromEnv();
  const apiKey = process.env.NEXT_PUBLIC_TON_PAY_API_KEY?.trim();
  return apiKey ? { chain, apiKey } : { chain };
}

/** Server-side `createTonPayTransfer` — prefers secret `TON_PAY_API_KEY`, falls back to public key. */
export function getServerTonPayOptions(): TonPayClientOptions {
  const chain = tonChainFromEnv();
  const secret = process.env.TON_PAY_API_KEY?.trim();
  const pub = process.env.NEXT_PUBLIC_TON_PAY_API_KEY?.trim();
  const apiKey = secret || pub;
  return apiKey ? { chain, apiKey } : { chain };
}

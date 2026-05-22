export type TonChain = "mainnet" | "testnet";

/**
 * Canonical chain for this deployment: `ODELHUB_TON_WALLET_ADDRESS`, TON Pay (`/api/public/checkout/ton-pay-transfer`),
 * and TonAPI (`lib/ton/tonapi.ts` for `/api/cron/confirm-ton`) must all be on this network.
 *
 * Precedence: `TON_NETWORK` (recommended on the server) → `NEXT_PUBLIC_TON_PAY_CHAIN` → mainnet.
 */
export function tonChainFromEnv(): TonChain {
  const raw =
    process.env.TON_NETWORK?.trim().toLowerCase() ??
    process.env.NEXT_PUBLIC_TON_PAY_CHAIN?.trim().toLowerCase() ??
    "";
  return raw === "testnet" ? "testnet" : "mainnet";
}

/** TonAPI HTTP origin for account/tx queries (mainnet vs testnet). */
export function tonApiOrigin(): string {
  return tonChainFromEnv() === "testnet" ? "https://testnet.tonapi.io" : "https://tonapi.io";
}

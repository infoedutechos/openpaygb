import { deploymentEnv } from "@/lib/deployment-env-resolve";

const TON_WALLET_PLACEHOLDER = "UQCS_placeholder_replace_with_real_wallet";

/** Default settlement wallet — dashboard override or process env. */
export function defaultTonWallet(): string {
  return deploymentEnv("ODELHUB_TON_WALLET_ADDRESS") || TON_WALLET_PLACEHOLDER;
}

/** Base UGX per 1 TON when env not set (matches infographic example). */
export function defaultUgxPerTon(): number {
  const raw = deploymentEnv("DEFAULT_UGX_PER_TON");
  const n = Number(raw || "257000");
  return Number.isFinite(n) && n > 0 ? n : 257000;
}

/** @deprecated Use defaultTonWallet() for dashboard-aware resolution. */
export const DEFAULT_TON_WALLET = defaultTonWallet();

/** @deprecated Use defaultUgxPerTon() for dashboard-aware resolution. */
export const DEFAULT_UGX_PER_TON = defaultUgxPerTon();

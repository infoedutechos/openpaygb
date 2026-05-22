/** Default settlement wallet (replace in production via env). */
export const DEFAULT_TON_WALLET =
  process.env.ODELHUB_TON_WALLET_ADDRESS ?? "UQCS_placeholder_replace_with_real_wallet";

/** Base UGX per 1 TON when env not set (matches infographic example). */
export const DEFAULT_UGX_PER_TON = Number(process.env.DEFAULT_UGX_PER_TON ?? "257000");

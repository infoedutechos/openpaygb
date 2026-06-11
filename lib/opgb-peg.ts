/** Phase 1: internal settlement peg — 1 OPGB = 1 UGX (integer minor units). */
export const OPGB_MINOR_UNITS_PER_UGX = 1;

/** Phase 2+ display basket (FX-quoted; settlement remains OPGB-UGX in Phase 1). */
export const OPGB_DISPLAY_CURRENCIES = [
  "momo",
  "ton",
  "usdt",
  "btc",
  "eth",
  "opgb",
] as const;

export type OpgbDisplayCurrency = (typeof OPGB_DISPLAY_CURRENCIES)[number];

/** Convert a UGX integer amount to OPGB minor units (Phase 1 identity). */
export function ugxToOpgbMinor(ugx: number): number {
  return Math.round(ugx * OPGB_MINOR_UNITS_PER_UGX);
}

/** Convert OPGB minor units back to UGX (Phase 1 identity). */
export function opgbMinorToUgx(minor: number): number {
  return Math.round(minor / OPGB_MINOR_UNITS_PER_UGX);
}

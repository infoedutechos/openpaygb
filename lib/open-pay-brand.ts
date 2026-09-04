/**
 * OpenPayGB — payer-facing mobile-money brand on ODEL HUB Pay.
 * Technical payment rails (ledger + APIs): Mbiyo, LivePay, Relworx (East Africa MoMo).
 * TON is a separate on-chain rail, not under OpenPayGB.
 */

export const OPEN_PAY_BRAND = "OpenPayGB";

/** @deprecated Prefer OPEN_PAY_BRAND — kept for existing imports */
export const OPEN_PAY_GLOBAL_NAME = OPEN_PAY_BRAND;
export const OPEN_PAY_GLOBAL_SHORT = "OpenPayGB";

/** Ledger rail `mbiyo` — MbiyoPay merchant API */
export const PAYMENT_RAIL_MBIYO = "Mbiyo";
/** Ledger rail `livepay` — LivePay REST API (UG MTN/Airtel) */
export const PAYMENT_RAIL_LIVEPAY = "LivePay";
/** Ledger rail `relworx` — Relworx Payments API v2 (MoMo collect) */
export const PAYMENT_RAIL_RELWORX = "Relworx";
/** Ledger rail `vixonpay` — VixonPay API (Uganda UGX MoMo) */
export const PAYMENT_RAIL_VIXONPAY = "VixonPay";
/** Ledger rail `openpay_card` — closed-loop platform virtual card (UGX balance) */
export const PAYMENT_RAIL_OPENPAY_CARD = "OpenPayGB card";
/** Ledger rail `card` — hosted Visa/MC acquiring (Flutterwave / Paystack) */
export const PAYMENT_RAIL_CARD = "Bank card";

/** Checkout UI section for platform card rail */
export const openPayCardRailSectionLabel = `${PAYMENT_RAIL_OPENPAY_CARD} (${OPEN_PAY_BRAND})`;
/** Checkout UI section for bank-card acquiring */
export const cardAcquiringRailSectionLabel = `${PAYMENT_RAIL_CARD} (${OPEN_PAY_BRAND})`;

/** Provider name (ops/docs); not the payer-facing brand */
export const MBIYO_PAY_INFRA_NAME = "MbiyoPay";

export const openPayBrandLabel = OPEN_PAY_BRAND;
export const openPayGlobalLabel = OPEN_PAY_BRAND;

/** Checkout UI section for Mbiyo rail */
export const mbiyoRailSectionLabel = `${PAYMENT_RAIL_MBIYO} (${OPEN_PAY_BRAND})`;
/** Checkout UI section for LivePay rail */
export const livepayRailSectionLabel = `${PAYMENT_RAIL_LIVEPAY} (${OPEN_PAY_BRAND})`;
/** Checkout UI section for Relworx rail */
export const relworxRailSectionLabel = `${PAYMENT_RAIL_RELWORX} (${OPEN_PAY_BRAND})`;
/** Checkout UI section for VixonPay rail */
export const vixonpayRailSectionLabel = `${PAYMENT_RAIL_VIXONPAY} (${OPEN_PAY_BRAND})`;

/** Legacy header — Mbiyo rail under OpenPayGB brand */
export const openPayGlobalMobileMoneyLabel = mbiyoRailSectionLabel;

/** e.g. pay method picker subtitle */
export const mobileMoneyRailsLabel = `${PAYMENT_RAIL_MBIYO} or ${PAYMENT_RAIL_LIVEPAY}`;

/** Admin / ops */
export const openPayGlobalInfrastructureNote =
  `${OPEN_PAY_BRAND} is the payer-facing brand. Mobile-money rails are ${PAYMENT_RAIL_MBIYO} (ledger \`mbiyo\`, ${MBIYO_PAY_INFRA_NAME} API) and ${PAYMENT_RAIL_LIVEPAY} (ledger \`livepay\`, Uganda).`;

/** e.g. "TON or Mbiyo / LivePay (OpenPayGB)" */
export function withOpenPayGlobal(alternative: string): string {
  return `${alternative} or ${mobileMoneyRailsLabel} via ${OPEN_PAY_BRAND}`;
}

export function withMobileMoneyRails(alternative: string): string {
  return `${alternative}, ${PAYMENT_RAIL_MBIYO}, ${PAYMENT_RAIL_LIVEPAY}, ${PAYMENT_RAIL_RELWORX}, or ${PAYMENT_RAIL_VIXONPAY}`;
}

/** e.g. stepper / status lines */
export function openPayGlobalStatus(suffix: string): string {
  return `${OPEN_PAY_BRAND} — ${suffix}`;
}

/** Mbiyo API / config error messages (rail name, not brand alone) */
export function mbiyoRailError(prefix: string): string {
  return `${PAYMENT_RAIL_MBIYO} ${prefix}`;
}

import { HUBS } from "@/lib/ecosystem/hubs";

export const INSUFFICIENT_FUNDS_MESSAGE =
  "Insufficient funds. Top up and continue your payment.";

export type CheckoutTopupRail = "ton" | "momo";

const INSUFFICIENT_PATTERNS = [
  /insufficient\s+funds?/i,
  /insufficient\s+balance/i,
  /not\s+enough\s+(funds?|balance|ton|money|ugx)/i,
  /low\s+balance/i,
  /balance\s+too\s+low/i,
  /exceeds?\s+(your\s+)?balance/i,
  /amount\s+exceeds/i,
  /declined.*(?:funds?|balance|money)/i,
  /(?:funds?|balance|money).*declined/i,
  /wallet\s+lacks?\s+funds?/i,
];

/** True when an error or provider message likely means the payer wallet lacked funds. */
export function isInsufficientFundsMessage(message: string | null | undefined): boolean {
  if (!message?.trim()) return false;
  const hay = message.trim();
  return INSUFFICIENT_PATTERNS.some((re) => re.test(hay));
}

export function checkoutTopupRailFromPayChannel(
  channel: "ton" | "mbiyo" | "livepay" | "relworx" | "openpay_card" | null,
): CheckoutTopupRail | null {
  if (channel === "ton") return "ton";
  if (channel === "mbiyo" || channel === "livepay" || channel === "relworx") return "momo";
  return null;
}

/** Top-up destination — TON onramp or MoMo onramp (Dex Hub). */
export function checkoutTopupHref(rail: CheckoutTopupRail, returnPath?: string): string {
  const base = HUBS.dex.routes?.onramp ?? "/dex/onramp";
  if (!returnPath?.trim()) return base;
  const next = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  return `${base}?next=${encodeURIComponent(next)}`;
}

/** Map provider / wallet errors to the standard insufficient-funds checkout message. */
export function checkoutPaymentErrorMessage(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : fallback;
  return isInsufficientFundsMessage(msg) ? INSUFFICIENT_FUNDS_MESSAGE : msg;
}

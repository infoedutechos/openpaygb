/**
 * LivePay multi-country expansion (future).
 * Uganda (UGX, MTN/AIRTEL) is implemented in livepay-start + PayWizard.
 */
export type LivePayCountryCode = "UG" | "KE" | "GH" | "CM";

export const LIVEPAY_SUPPORTED_COUNTRIES: {
  code: LivePayCountryCode;
  currency: string;
  label: string;
  implemented: boolean;
}[] = [
  { code: "UG", currency: "UGX", label: "Uganda", implemented: true },
  { code: "KE", currency: "KES", label: "Kenya", implemented: false },
  { code: "GH", currency: "GHS", label: "Ghana", implemented: false },
  { code: "CM", currency: "XAF", label: "Cameroon", implemented: false },
];

export function isLivePayCountryImplemented(code: string): boolean {
  return LIVEPAY_SUPPORTED_COUNTRIES.some((c) => c.code === code && c.implemented);
}

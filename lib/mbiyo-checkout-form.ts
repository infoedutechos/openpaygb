/** Shared OpenPayGB / Mbiyo pay-in form helpers (MbiyoPay API metadata). */

import {
  MBIYO_SUPPORTED_COUNTRIES,
  findMbiyoCountry,
  mbiyoCurrencyForCountry,
  mbiyoNetworksForCountry,
} from "@/lib/mbiyo/supported-countries";

export { MBIYO_SUPPORTED_COUNTRIES as MBIYO_COUNTRIES };
export { mbiyoCurrencyForCountry, mbiyoNetworksForCountry, findMbiyoCountry };

export function dialForMbiyoCountry(countryCode: string): string | undefined {
  return findMbiyoCountry(countryCode)?.dial;
}

/**
 * Accepts E.164 (+…) or national digits for the selected country (leading 0 stripped).
 */
export function toE164FromNational(raw: string, countryCode: string): string | null {
  const dial = dialForMbiyoCountry(countryCode);
  if (!dial) return null;
  let s = raw.trim().replace(/[\s-]/g, "");
  if (!s) return null;
  if (s.startsWith("+")) {
    return /^\+\d{10,15}$/.test(s) ? s : null;
  }
  s = s.replace(/^0+/, "");
  if (s.startsWith(dial)) {
    const c = "+" + s;
    return /^\+\d{10,15}$/.test(c) ? c : null;
  }
  const c = "+" + dial + s;
  return /^\+\d{10,15}$/.test(c) ? c : null;
}

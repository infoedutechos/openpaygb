import { ugandaPhoneToE164 } from "@/lib/livepay/uganda-phone";

/** VixonPay expects international format without + (e.g. 256751142954). */
export function ugandaPhoneForVixonPay(raw: string): string | null {
  const e164 = ugandaPhoneToE164(raw);
  if (!e164) return null;
  return e164.slice(1);
}

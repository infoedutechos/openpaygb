/** Normalize Uganda mobile numbers to E.164 (+256…) for LivePay. */
export function ugandaPhoneToE164(raw: string): string | null {
  const t = raw.replace(/\s/g, "").trim();
  if (!t) return null;
  if (t.startsWith("+")) {
    return /^\+\d{10,15}$/.test(t) ? t : null;
  }
  if (t.startsWith("256") && t.length >= 12) {
    return `+${t}`;
  }
  if (t.startsWith("0") && t.length >= 10) {
    return `+256${t.slice(1)}`;
  }
  return null;
}

/** Loose TON user-friendly address check (EQ… / UQ… / kQ… testnet). */
export function isPlausibleTonAddress(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 48 || s.length > 66) return false;
  return /^(EQ|UQ|kQ|0Q)[A-Za-z0-9_-]+$/.test(s);
}

export function normalizeTonAddress(raw: string): string {
  return raw.trim();
}

/** Compare two TON addresses case-insensitively (EQ vs UQ bounceable flags may differ in UI). */
export function tonAddressesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = a?.trim();
  const y = b?.trim();
  if (!x || !y) return false;
  if (x === y) return true;
  return x.toLowerCase() === y.toLowerCase();
}

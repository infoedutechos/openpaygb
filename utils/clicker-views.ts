/** Client SPA views for /clicker (also used for ?view= deep links). */
export const CLICKER_VIEWS = new Set([
  'home',
  'game',
  'boost',
  'settings',
  'mine',
  'friends',
  'eearn',
  'ura-tv',
  'ura-fc',
  'services',
  'guild',
  'earn',
  'karibu-daily',
  'airdrop',
  'collection',
]);

export function resolveClickerView(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  return CLICKER_VIEWS.has(v) ? v : null;
}

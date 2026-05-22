/** Client-only: ask pearl UIs (e.g. Home) to refetch `/api/pearls/me` after server credits white pearls. */

export const PEARLS_BALANCE_REFRESH_EVENT = 'ura-pearls-refresh';

export function notifyPearlBalancesRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PEARLS_BALANCE_REFRESH_EVENT));
}

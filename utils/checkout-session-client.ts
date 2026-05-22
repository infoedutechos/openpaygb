const STORAGE_PREFIX = "odelhub_checkout_token:";

function storageKey(orgSlug: string): string {
  return `${STORAGE_PREFIX}${orgSlug.trim().toLowerCase()}`;
}

export function getCheckoutToken(orgSlug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(storageKey(orgSlug));
  } catch {
    return null;
  }
}

export function setCheckoutToken(orgSlug: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(orgSlug), token);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearCheckoutToken(orgSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(orgSlug));
  } catch {
    /* ignore */
  }
}

export function checkoutAuthHeaders(orgSlug: string): Record<string, string> {
  const token = getCheckoutToken(orgSlug);
  if (!token) return {};
  return { "x-checkout-token": token };
}

/** Persisted Uganda district slug for sync on POST /api/user (Telegram does not supply district). */
export const USER_DISTRICT_SLUG_KEY = 'ura:user_district_slug';

export function readStoredDistrictSlug(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(USER_DISTRICT_SLUG_KEY)?.trim().toLowerCase();
    return v || null;
  } catch {
    return null;
  }
}

export function writeStoredDistrictSlug(slug: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!slug) localStorage.removeItem(USER_DISTRICT_SLUG_KEY);
    else localStorage.setItem(USER_DISTRICT_SLUG_KEY, slug.trim().toLowerCase());
  } catch {
    /* ignore quota / private mode */
  }
}

const STORAGE_PREFIX = "odelhub-guest-last-";

export function readGuestPreviousVisit(studentId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${studentId}`);
  } catch {
    return null;
  }
}

/** Records this checkout visit; returns the previous visit ISO timestamp (if any). */
export function recordGuestCheckoutVisit(studentId: string): string | null {
  if (typeof window === "undefined") return null;
  const key = `${STORAGE_PREFIX}${studentId}`;
  try {
    const prev = localStorage.getItem(key);
    localStorage.setItem(key, new Date().toISOString());
    return prev;
  } catch {
    return null;
  }
}

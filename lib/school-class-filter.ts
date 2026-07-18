/** Client-side school ERP class filter (All = empty). Syncs SchoolContextBar ↔ list pages. */

export const SCHOOL_CLASS_FILTER_KEY = "odelhub.schoolClassFilterId";
export const SCHOOL_CLASS_FILTER_EVENT = "odelhub:school-class-filter";

export function readSchoolClassFilterId(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(SCHOOL_CLASS_FILTER_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeSchoolClassFilterId(id: string): void {
  if (typeof window === "undefined") return;
  const next = id.trim();
  try {
    if (next) sessionStorage.setItem(SCHOOL_CLASS_FILTER_KEY, next);
    else sessionStorage.removeItem(SCHOOL_CLASS_FILTER_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(SCHOOL_CLASS_FILTER_EVENT, { detail: { schoolClassId: next } }));
}

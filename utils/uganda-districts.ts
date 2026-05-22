import raw from './uganda-districts.json';

export type UgandaDistrict = { readonly name: string; readonly slug: string };

export const UGANDA_DISTRICTS: UgandaDistrict[] = raw as UgandaDistrict[];

const SLUG_SET = new Set(UGANDA_DISTRICTS.map((d) => d.slug));
const SLUG_TO_NAME: Record<string, string> = Object.fromEntries(
  UGANDA_DISTRICTS.map((d) => [d.slug, d.name])
);

/** Special filter: users with no district stored */
export const DISTRICT_FILTER_NONE = '__none__';
/** Special filter: users with a non-canonical district string */
export const DISTRICT_FILTER_OTHER = '__other__';

export function isValidDistrictSlug(s: string | null | undefined): boolean {
  if (!s) return false;
  return SLUG_SET.has(s.trim().toLowerCase());
}

export function getDistrictDisplayName(slug: string | null | undefined): string {
  if (!slug) return 'Not set';
  const key = slug.trim().toLowerCase();
  return SLUG_TO_NAME[key] ?? slug;
}

export const CANONICAL_DISTRICT_SLUGS: readonly string[] = UGANDA_DISTRICTS.map((d) => d.slug);

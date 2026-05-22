/**
 * Shared URL helpers for Tuition Hub (public pay is scoped by org slug under `/pay/[orgSlug]`).
 */

/** Base path for the current pay tenant, e.g. `/pay/default` or `/pay/acme` from `usePathname()`. */
export function payTenantBasePath(pathname: string | null): string {
  const m = pathname?.match(/^\/pay\/([^/]+)/);
  const slug = m?.[1]?.trim().toLowerCase();
  if (slug) return `/pay/${encodeURIComponent(slug)}`;
  return "/pay/default";
}

export function payProgrammesHref(pathname: string | null): string {
  return `${payTenantBasePath(pathname)}?programmes=1`;
}

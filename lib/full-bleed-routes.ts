/** Routes that use full-bleed layout (no marketing max-width shell). */
export const FULL_BLEED_PREFIXES = [
  "/admin",
  "/school-admin",
  "/pay",
  "/clicker",
  "/student",
  "/my",
  "/dex",
] as const;

export function isFullBleedRoute(pathname: string): boolean {
  return FULL_BLEED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function mainLayoutClassName(pathname: string): string {
  return isFullBleedRoute(pathname)
    ? "min-h-dvh w-full max-w-none p-0"
    : "mx-auto max-w-6xl px-4 pb-24 pt-10 md:pb-28 md:pt-12";
}

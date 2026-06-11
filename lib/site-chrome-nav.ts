/** Routes with their own shell or dock — skip global bottom nav / extra footer clearance. */
export const HIDE_SITE_CHROME_NAV_PREFIXES = [
  "/admin",
  "/school",
  "/school-admin",
  "/pay",
  "/student",
  "/my",
  "/clicker",
  "/dex",
  "/receipt",
  "/api",
] as const;

export function hidesSiteChromeNav(pathname: string): boolean {
  if (pathname === "/") return true;
  return HIDE_SITE_CHROME_NAV_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

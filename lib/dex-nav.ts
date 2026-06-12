/** Cross-hub Dex entry — use in every signed-in dashboard sidebar. */
export const DEX_HUB_HREF = "/dex";

export const DEX_HUB_LABEL = "Dex Hub";

export const DEX_SIDEBAR_NAV = { href: DEX_HUB_HREF, label: DEX_HUB_LABEL } as const;

export function pathnameIsDexHub(pathname: string): boolean {
  return pathname === DEX_HUB_HREF || pathname.startsWith(`${DEX_HUB_HREF}/`);
}

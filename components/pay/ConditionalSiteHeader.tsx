"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/pay/SiteHeader";
import { useStandaloneApp } from "@/components/standalone/StandaloneAppProvider";

/**
 * Global site header for home + all user categories (student, staff, admin, developers, etc.).
 * Only skipped for standalone embeds and the Play clicker surface.
 */
function hidesGlobalHeader(pathname: string, standaloneAppId?: string | null): boolean {
  if (standaloneAppId) return true;
  if (pathname === "/clicker" || pathname.startsWith("/clicker/")) return true;
  return false;
}

export function ConditionalSiteHeader({ initialPathname }: { initialPathname: string }) {
  const { appId } = useStandaloneApp();
  const pathname = usePathname() ?? initialPathname;
  if (hidesGlobalHeader(pathname, appId)) return null;
  return <SiteHeader />;
}

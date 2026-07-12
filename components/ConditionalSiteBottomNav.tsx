"use client";

import { usePathname } from "next/navigation";
import { SiteBottomNav } from "@/components/SiteBottomNav";
import { useStandaloneApp } from "@/components/standalone/StandaloneAppProvider";
import { hidesSiteChromeNav } from "@/lib/site-chrome-nav";

export function ConditionalSiteBottomNav() {
  const { appId } = useStandaloneApp();
  const pathname = usePathname() ?? "";
  if (hidesSiteChromeNav(pathname, appId)) return null;
  return <SiteBottomNav />;
}

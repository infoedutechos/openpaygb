"use client";

import { usePathname } from "next/navigation";
import { SiteBottomNav } from "@/components/SiteBottomNav";
import { hidesSiteChromeNav } from "@/lib/site-chrome-nav";

export function ConditionalSiteBottomNav() {
  const pathname = usePathname() ?? "";
  if (hidesSiteChromeNav(pathname)) return null;
  return <SiteBottomNav />;
}

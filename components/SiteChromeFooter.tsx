"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { useStandaloneApp } from "@/components/standalone/StandaloneAppProvider";
import { footerVisibleForPath, type PublicSiteUiSettings } from "@/lib/site-ui-shared";
import { hidesSiteChromeNav } from "@/lib/site-chrome-nav";

type Props = {
  settings: PublicSiteUiSettings;
};

/** Client wrapper: hides footer on paths excluded by master footer mode. */
export function SiteChromeFooter({ settings }: Props) {
  const { appId } = useStandaloneApp();
  const pathname = usePathname() ?? "";
  if (appId) return null;
  if (!footerVisibleForPath(settings, pathname)) return null;
  return (
    <SiteFooter settings={settings} bottomNavClearance={!hidesSiteChromeNav(pathname, appId)} />
  );
}

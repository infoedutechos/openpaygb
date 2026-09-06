"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { SiteTitleBar } from "@/components/SiteTitleBar";
import { useStandaloneApp } from "@/components/standalone/StandaloneAppProvider";

/** Hide title bar on home (brand lives in SiteHeader) and embedded/standalone surfaces. */
function hidesTitleBar(pathname: string, standaloneAppId?: string | null): boolean {
  if (standaloneAppId) return true;
  if (pathname === "/") return true;
  if (pathname === "/clicker" || pathname.startsWith("/clicker/")) return true;
  return false;
}

function ConditionalSiteTitleBarInner({ initialPathname }: { initialPathname: string }) {
  const { appId } = useStandaloneApp();
  const pathname = usePathname() ?? initialPathname;
  if (hidesTitleBar(pathname, appId)) return null;
  return <SiteTitleBar />;
}

export function ConditionalSiteTitleBar({ initialPathname }: { initialPathname: string }) {
  return (
    <Suspense fallback={null}>
      <ConditionalSiteTitleBarInner initialPathname={initialPathname} />
    </Suspense>
  );
}

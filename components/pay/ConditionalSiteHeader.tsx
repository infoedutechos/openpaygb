"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/pay/SiteHeader";
import { useStandaloneApp } from "@/components/standalone/StandaloneAppProvider";

/** Routes with their own shell — skip global header + `/api/student/session` probe. */
const HIDE_HEADER_PREFIXES = [
  "/admin",
  "/school",
  "/school-admin",
  "/pay",
  "/student",
  "/my",
  "/clicker",
  "/dex",
  "/opgb",
  "/OdelPayUniversities",
  "/OdelPaySchools",
  "/developers",
] as const;

function hidesGlobalHeader(pathname: string, standaloneAppId?: string | null): boolean {
  if (standaloneAppId) return true;
  return HIDE_HEADER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function ConditionalSiteHeader({ initialPathname }: { initialPathname: string }) {
  const { appId } = useStandaloneApp();
  const pathname = usePathname() ?? initialPathname;
  if (hidesGlobalHeader(pathname, appId)) return null;
  return <SiteHeader />;
}

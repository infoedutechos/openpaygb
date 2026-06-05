"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/pay/SiteHeader";

/** Routes with their own shell — skip global header + `/api/student/session` probe. */
const HIDE_HEADER_PREFIXES = [
  "/admin",
  "/school-admin",
  "/pay",
  "/student",
  "/my",
  "/clicker",
  "/dex",
] as const;

function hidesGlobalHeader(pathname: string): boolean {
  return HIDE_HEADER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function ConditionalSiteHeader({ initialPathname }: { initialPathname: string }) {
  const pathname = usePathname() ?? initialPathname;
  if (hidesGlobalHeader(pathname)) return null;
  return <SiteHeader />;
}

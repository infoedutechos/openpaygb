'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/pay/SiteHeader';

/** Routes with their own shell — skip global header + `/api/student/session` probe. */
const HIDE_HEADER_PREFIXES = [
  '/admin',
  '/school-admin',
  '/pay',
  '/student',
  '/my',
  '/clicker',
  '/dex',
] as const;

function hidesGlobalHeader(pathname: string): boolean {
  return HIDE_HEADER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Hide global marketing header inside app shells (Play, tuition pay, admin, student). */
export function ConditionalSiteHeader() {
  const pathname = usePathname() ?? '';
  if (hidesGlobalHeader(pathname)) return null;
  return <SiteHeader />;
}

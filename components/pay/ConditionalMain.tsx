'use client';

import { usePathname } from 'next/navigation';

const FULL_BLEED_PREFIXES = ['/admin', '/school-admin', '/pay', '/clicker', '/student', '/my', '/dex'] as const;

function isFullBleedRoute(pathname: string): boolean {
  return FULL_BLEED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const fullBleed = isFullBleedRoute(pathname);
  return (
    <main
      className={
        fullBleed
          ? 'min-h-dvh w-full max-w-none p-0'
          : 'mx-auto max-w-6xl px-4 pb-24 pt-10 md:pb-28 md:pt-12'
      }
    >
      {children}
    </main>
  );
}

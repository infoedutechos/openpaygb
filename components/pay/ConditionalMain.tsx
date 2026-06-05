"use client";

import { usePathname } from "next/navigation";
import { mainLayoutClassName } from "@/lib/full-bleed-routes";

export function ConditionalMain({
  children,
  initialPathname,
}: {
  children: React.ReactNode;
  /** From middleware `x-pathname` — keeps SSR and first client paint aligned. */
  initialPathname: string;
}) {
  const clientPath = usePathname();
  const pathname = clientPath ?? initialPathname;
  return <main className={mainLayoutClassName(pathname)}>{children}</main>;
}

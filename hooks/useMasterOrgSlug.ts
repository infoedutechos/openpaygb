"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Master tenant filter from `?orgSlug=` — syncs URL and local filter state. */
export function useMasterOrgSlug() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const orgSlug = useMemo(
    () => searchParams.get("orgSlug")?.trim().toLowerCase() ?? "",
    [searchParams],
  );

  const setOrgSlug = useCallback(
    (slug: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      const next = slug.trim().toLowerCase();
      if (next) sp.set("orgSlug", next);
      else sp.delete("orgSlug");
      const q = sp.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const hrefWithOrgSlug = useCallback(
    (path: string) => {
      if (!orgSlug) return path;
      const sep = path.includes("?") ? "&" : "?";
      return `${path}${sep}orgSlug=${encodeURIComponent(orgSlug)}`;
    },
    [orgSlug],
  );

  return { orgSlug, setOrgSlug, hrefWithOrgSlug };
}

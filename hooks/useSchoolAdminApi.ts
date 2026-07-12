"use client";

import { useMemo } from "react";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";

function appendSchoolQuery(
  path: string,
  params: Record<string, string | number | undefined | null> | undefined,
  organizationSlug: string | undefined,
) {
  const [base, existingQs] = path.split("?");
  const sp = new URLSearchParams(existingQs);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
    }
  }
  if (organizationSlug) sp.set("organizationSlug", organizationSlug);
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

/** School ERP API scope — org_admin on school tier, or master with ?orgSlug= on a school tenant. */
export function useSchoolAdminApi() {
  const { orgSlug, hrefWithOrgSlug } = useMasterOrgSlug();
  const { data: authMe } = useAuthMe();
  const isMaster = authMe?.admin?.role === "master";
  const isSchoolOrgAdmin = authMe?.admin?.organization?.institutionTier === "school";

  const schoolScope = isSchoolOrgAdmin || (isMaster && Boolean(orgSlug));
  const organizationSlug = isMaster && orgSlug ? orgSlug : undefined;

  const qs = useMemo(
    () => (params?: Record<string, string | number | undefined | null>) =>
      appendSchoolQuery("", params, organizationSlug).replace(/^\?/, "") || "",
    [organizationSlug],
  );

  const schoolUrl = useMemo(
    () => (path: string, params?: Record<string, string | number | undefined | null>) =>
      appendSchoolQuery(path, params, organizationSlug),
    [organizationSlug],
  );

  const schoolFetch = useMemo(
    () =>
      (path: string, init?: RequestInit, params?: Record<string, string | number | undefined | null>) =>
        fetch(schoolUrl(path, params), { credentials: "include", ...init }),
    [schoolUrl],
  );

  return {
    orgSlug,
    isMaster,
    isSchoolOrgAdmin,
    schoolScope,
    qs,
    schoolUrl,
    schoolFetch,
    hrefWithOrgSlug,
    needsOrgSlug: isMaster && !orgSlug,
    organizationSlug,
  };
}

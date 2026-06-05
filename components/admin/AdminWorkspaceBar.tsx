"use client";

import Link from "next/link";
import { Suspense } from "react";
import { AdminGlobalSearch } from "@/components/AdminGlobalSearch";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";
import { TenantList } from "@/components/tuition/TenantList";

function AdminWorkspaceBarInner() {
  const { data: authMe } = useAuthMe();
  const isMaster = authMe?.admin?.role === "master";
  const { orgSlug, setOrgSlug } = useMasterOrgSlug();

  const workspaceName =
    authMe?.admin?.organization?.name ??
    (isMaster && orgSlug ? `Tenant: ${orgSlug}` : isMaster ? "All workspaces" : "Workspace");

  const paySlug = authMe?.admin?.organization?.slug ?? (isMaster ? orgSlug : "");

  return (
    <div className="mb-6 space-y-4 rounded-xl border border-white/10 bg-[#0a101f]/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200/80">Workspace</p>
          <p className="truncate text-sm font-medium text-white" title={workspaceName}>
            {workspaceName}
          </p>
          {paySlug ? (
            <p className="mt-1 text-xs text-slate-500">
              Guest pay:{" "}
              <Link href={`/pay/${paySlug}`} className="font-mono text-cyan-300/90 hover:underline">
                /pay/{paySlug}
              </Link>
            </p>
          ) : null}
          <p className="mt-1 text-xs text-slate-600">
            School sign-in:{" "}
            <Link href="/school/login" className="text-slate-400 hover:text-cyan-200">
              /school/login
            </Link>
          </p>
        </div>
        {isMaster ? (
          <div className="w-full min-w-[200px] max-w-xs sm:w-auto">
            <TenantList
              filterMode
              currentSlug={orgSlug || undefined}
              onPickSlug={(slug) => setOrgSlug(slug)}
              title="Filter tenant"
            />
            {orgSlug ? (
              <button
                type="button"
                onClick={() => setOrgSlug("")}
                className="mt-2 text-xs text-slate-500 hover:text-white"
              >
                Clear tenant filter
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <AdminGlobalSearch />
    </div>
  );
}

export function AdminWorkspaceBar() {
  return (
    <Suspense fallback={null}>
      <AdminWorkspaceBarInner />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { workspaceEmailVerifyStatus } from "@/lib/organization-workspace-verify-shared";
import type { MasterOrgRow } from "@/components/admin/master-org/types";

type Props = {
  org: MasterOrgRow;
  busyId: string | null;
  compact?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReopen: () => void;
};

export function MasterOrgActions({ org, busyId, compact, onApprove, onReject, onReopen }: Props) {
  if (org.slug === "default") {
    return <span className="text-xs text-slate-500">{compact ? "template org" : "template"}</span>;
  }

  if (org.tenantStatus === "pending") {
    return (
      <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-1"}>
        {workspaceEmailVerifyStatus(org) === "pending" ? (
          <span
            className={
              compact
                ? "text-[11px] text-amber-300/90"
                : "max-w-[180px] text-[10px] leading-snug text-amber-300/90"
            }
          >
            {compact
              ? "Email not verified yet — you can still approve; the school dashboard will show a reminder."
              : "Email not verified — you may approve anyway; their dashboard will prompt them to confirm."}
          </span>
        ) : null}
        <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap gap-1"}>
          <button
            type="button"
            disabled={busyId === org.id}
            title="Approve workspace"
            onClick={onApprove}
            className={
              compact
                ? "min-h-[44px] flex-1 rounded-lg bg-emerald-700/80 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                : "rounded bg-emerald-700/80 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            }
          >
            Approve workspace
          </button>
          <button
            type="button"
            disabled={busyId === org.id}
            onClick={onReject}
            className={
              compact
                ? "min-h-[44px] flex-1 rounded-lg bg-rose-800/80 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                : "rounded bg-rose-800/80 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            }
          >
            Reject
          </button>
        </div>
      </div>
    );
  }

  if (org.tenantStatus === "active") {
    return (
      <Link
        href={`/admin?orgSlug=${encodeURIComponent(org.slug)}`}
        className={
          compact
            ? "inline-flex min-h-[44px] items-center text-xs text-sky-300 underline"
            : "text-xs text-sky-300 underline hover:text-white"
        }
      >
        Open tuition dashboard
      </Link>
    );
  }

  if (org.tenantStatus === "rejected") {
    return (
      <button
        type="button"
        disabled={busyId === org.id}
        onClick={onReopen}
        className={
          compact
            ? "min-h-[44px] w-full rounded-lg bg-amber-700/80 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            : "rounded bg-amber-700/80 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        }
      >
        Reopen for review
      </button>
    );
  }

  return <span className="text-xs text-slate-500">—</span>;
}

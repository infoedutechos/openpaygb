"use client";

import { workspaceEmailVerifyStatus } from "@/lib/organization-workspace-verify-shared";
import { MasterOrgEmailVerifyBadge } from "@/components/admin/master-org/utils";
import type { MasterOrgRow } from "@/components/admin/master-org/types";

type Props = {
  org: MasterOrgRow;
  compact?: boolean;
  busyId: string | null;
  onResendVerification?: () => void;
};

export function MasterOrgEmailVerify({ org, compact, busyId, onResendVerification }: Props) {
  const pending = workspaceEmailVerifyStatus(org) === "pending" && org.registrationContactEmail;

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <MasterOrgEmailVerifyBadge org={org} />
        {pending && onResendVerification ? (
          <button
            type="button"
            disabled={busyId === org.id}
            onClick={onResendVerification}
            className="text-left text-[10px] font-medium text-amber-200/90 underline hover:text-amber-100 disabled:opacity-50"
          >
            Resend verify email
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {org.registrationContactEmail ? (
        <p className="truncate text-xs text-slate-400" title={org.registrationContactEmail}>
          {org.registrationContactEmail}
          {workspaceEmailVerifyStatus(org) === "verified" ? (
            <span className="ml-2 text-emerald-400">· verified</span>
          ) : workspaceEmailVerifyStatus(org) === "pending" ? (
            <span className="ml-2 text-amber-300">· email pending</span>
          ) : null}
        </p>
      ) : null}
      {pending && onResendVerification ? (
        <button
          type="button"
          disabled={busyId === org.id}
          onClick={onResendVerification}
          className="mt-2 min-h-[44px] text-xs font-medium text-amber-200/90 underline hover:text-amber-100 disabled:opacity-50"
        >
          Resend verify email
        </button>
      ) : null}
    </div>
  );
}

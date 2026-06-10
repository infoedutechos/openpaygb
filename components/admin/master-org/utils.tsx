import { workspaceEmailVerifyStatus } from "@/lib/organization-workspace-verify-shared";
import type { MasterOrgRow } from "@/components/admin/master-org/types";

export function masterOrgStatusTone(s: string) {
  if (s === "active") return "text-emerald-300";
  if (s === "pending") return "text-amber-300";
  return "text-rose-300";
}

export function MasterOrgEmailVerifyBadge({ org }: { org: MasterOrgRow }) {
  const s = workspaceEmailVerifyStatus(org);
  if (s === "none") return <span className="text-slate-600">—</span>;
  if (s === "verified") return <span className="font-medium text-emerald-400">Verified</span>;
  return <span className="font-medium text-amber-300">Awaiting email</span>;
}

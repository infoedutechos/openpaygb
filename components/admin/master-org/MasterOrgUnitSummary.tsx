"use client";

import type { MasterOrgRow } from "@/components/admin/master-org/types";
import { organizationUnitKindLabel } from "@/lib/organization-unit-kinds";

type Props = {
  org: MasterOrgRow;
  compact?: boolean;
};

export function MasterOrgUnitSummary({ org, compact }: Props) {
  const kind = org.unitKind ?? "main_campus";
  const label = organizationUnitKindLabel(kind);
  const parent =
    org.parentOrganization?.name ??
    (org.externalParentName?.trim() ? org.externalParentName.trim() : null);
  const operates =
    kind === "main_campus" && org.operatesUnitKinds?.length
      ? org.operatesUnitKinds
          .filter((k) => k !== "main_campus")
          .map((k) => organizationUnitKindLabel(k))
          .join(", ")
      : null;

  if (compact) {
    return (
      <div className="mt-2 space-y-1 text-xs text-slate-500">
        <p>
          <span className="text-slate-600">Unit:</span>{" "}
          <span className="text-slate-300">{label}</span>
        </p>
        {parent ? (
          <p>
            <span className="text-slate-600">Parent:</span>{" "}
            <span className="text-slate-300">{parent}</span>
            {org.parentOrganization?.slug ? (
              <span className="ml-1 font-mono text-cyan-200/70">({org.parentOrganization.slug})</span>
            ) : null}
          </p>
        ) : null}
        {operates ? (
          <p>
            <span className="text-slate-600">Also operates:</span>{" "}
            <span className="text-slate-400">{operates}</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="text-xs text-slate-400">
      <p className="font-medium text-slate-300">{label}</p>
      {parent ? (
        <p className="mt-0.5 truncate" title={parent}>
          Parent: {parent}
          {org.parentOrganization?.slug ? (
            <span className="ml-1 font-mono text-cyan-200/70">({org.parentOrganization.slug})</span>
          ) : null}
        </p>
      ) : (
        <p className="mt-0.5 text-slate-600">—</p>
      )}
      {operates ? <p className="mt-0.5 text-slate-500">Operates: {operates}</p> : null}
    </div>
  );
}

"use client";

import {
  ORGANIZATION_UNIT_KINDS,
  ORGANIZATION_UNIT_KIND_LABELS,
  type OrganizationUnitKind,
} from "@/lib/organization-unit-kinds";

type Props = {
  unitKind: OrganizationUnitKind;
  operatesUnitKinds: OrganizationUnitKind[];
  parentSlug: string;
  externalParentName: string;
  parentOptions: Array<{ slug: string; name: string }>;
  onUnitKindChange: (k: OrganizationUnitKind) => void;
  onOperatesToggle: (k: OrganizationUnitKind) => void;
  onParentSlugChange: (v: string) => void;
  onExternalParentChange: (v: string) => void;
};

export function OrganizationUnitKindPicker({
  unitKind,
  operatesUnitKinds,
  parentSlug,
  externalParentName,
  parentOptions,
  onUnitKindChange,
  onOperatesToggle,
  onParentSlugChange,
  onExternalParentChange,
}: Props) {
  const isMain = unitKind === "main_campus";

  return (
    <div className="space-y-4 rounded-xl border border-cyan-500/15 bg-cyan-950/10 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/80">Institution type</p>
        <p className="mt-1 text-[11px] text-slate-500">What is this workspace?</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {ORGANIZATION_UNIT_KINDS.map((kind) => {
            const on = unitKind === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => onUnitKindChange(kind)}
                className={`min-h-[44px] rounded-lg border px-3 py-2 text-left text-xs transition ${
                  on
                    ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 bg-black/20 text-slate-300 hover:border-white/20"
                }`}
              >
                {ORGANIZATION_UNIT_KIND_LABELS[kind]}
              </button>
            );
          })}
        </div>
      </div>

      {isMain ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/80">What you operate</p>
          <p className="mt-1 text-[11px] text-slate-500">Select all that apply (main campus is included automatically)</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ORGANIZATION_UNIT_KINDS.filter((k) => k !== "main_campus").map((kind) => {
              const on = operatesUnitKinds.includes(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onOperatesToggle(kind)}
                  className={`min-h-[40px] rounded-full border px-3 py-1.5 text-xs ${
                    on
                      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                      : "border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  {ORGANIZATION_UNIT_KIND_LABELS[kind]}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/80">Parent institution</p>
          <p className="text-[11px] text-slate-500">
            This workspace is a {ORGANIZATION_UNIT_KIND_LABELS[unitKind]} of another school
          </p>
          <label className="block">
            <span className="text-[11px] text-slate-500">Parent on ODEL HUB (slug)</span>
            <input
              list="parent-org-options"
              value={parentSlug}
              onChange={(e) => onParentSlugChange(e.target.value.toLowerCase())}
              placeholder="e.g. team-university"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2 font-mono text-sm text-white"
            />
            <datalist id="parent-org-options">
              {parentOptions.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.name}
                </option>
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Or parent name (if not on ODEL HUB)</span>
            <input
              value={externalParentName}
              onChange={(e) => onExternalParentChange(e.target.value)}
              placeholder="e.g. TEAM UNIVERSITY"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
      )}
    </div>
  );
}

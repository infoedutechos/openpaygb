"use client";

import { useCallback, useEffect, useState } from "react";
import { schoolTermLabel, schoolTermOptions } from "@/lib/school-term";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

type Context = {
  activeTerm: number;
  sessionLabel: string;
  currentAcademicYearLabel: string;
};

export function SchoolContextBar({ onContextChange }: { onContextChange?: (ctx: Context) => void }) {
  const { schoolFetch, organizationSlug, needsOrgSlug } = useSchoolAdminApi();
  const [context, setContext] = useState<Context | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (needsOrgSlug) return;
    const r = await schoolFetch("/api/admin/school/sessions");
    if (!r.ok) return;
    const j = (await r.json()) as { context?: Context };
    if (j.context) {
      setContext(j.context);
      onContextChange?.(j.context);
    }
  }, [needsOrgSlug, onContextChange, schoolFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setTerm(term: number) {
    setBusy(true);
    try {
      await schoolFetch("/api/admin/school/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeTerm: term, organizationSlug }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (needsOrgSlug || !context) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-cyan-500/25 bg-cyan-950/20 px-4 py-3 text-sm">
      <span className="text-slate-400">Active session</span>
      <span className="font-semibold text-white">{context.sessionLabel || context.currentAcademicYearLabel || "—"}</span>
      <span className="text-slate-600">|</span>
      <label className="flex items-center gap-2 text-slate-400">
        Term
        <select
          disabled={busy}
          value={context.activeTerm}
          onChange={(e) => void setTerm(Number(e.target.value))}
          className="rounded-lg border border-white/15 bg-[#0a101f] px-2 py-1 text-white"
        >
          {schoolTermOptions().map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} ({o.ordinal})
            </option>
          ))}
        </select>
      </label>
      <span className="text-xs text-slate-500">{schoolTermLabel(context.activeTerm)} applies globally</span>
    </div>
  );
}

export function formatUgx(n: number): string {
  return `UGX ${n.toLocaleString("en-UG")}`;
}

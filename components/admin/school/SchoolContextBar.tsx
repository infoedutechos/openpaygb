"use client";

import { useCallback, useEffect, useState } from "react";
import { schoolTermLabel, schoolTermOptions } from "@/lib/school-term";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import {
  readSchoolClassFilterId,
  writeSchoolClassFilterId,
  SCHOOL_CLASS_FILTER_EVENT,
} from "@/lib/school-class-filter";

type Context = {
  activeTerm: number;
  sessionLabel: string;
  currentAcademicYearLabel: string;
};

type ClassOption = { id: string; code: string; name: string; enabled?: boolean };

export function SchoolContextBar({ onContextChange }: { onContextChange?: (ctx: Context) => void }) {
  const { schoolFetch, organizationSlug, needsOrgSlug } = useSchoolAdminApi();
  const [context, setContext] = useState<Context | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [schoolClassId, setSchoolClassId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (needsOrgSlug) return;
    const [sessRes, classRes] = await Promise.all([
      schoolFetch("/api/admin/school/sessions"),
      // List all org classes so the Class filter is never empty after a session rollover.
      schoolFetch("/api/admin/school/classes", undefined, { allSessions: "1" }),
    ]);
    if (sessRes.ok) {
      const j = (await sessRes.json()) as { context?: Context };
      if (j.context) {
        setContext(j.context);
        onContextChange?.(j.context);
      }
    }
    if (classRes.ok) {
      const j = (await classRes.json()) as { classes?: ClassOption[] };
      const list = (j.classes ?? []).filter((c) => c.enabled !== false);
      setClasses(list);
      const saved = readSchoolClassFilterId();
      if (saved && list.some((c) => c.id === saved)) setSchoolClassId(saved);
      else {
        setSchoolClassId("");
        if (saved) writeSchoolClassFilterId("");
      }
    }
  }, [needsOrgSlug, onContextChange, schoolFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onFilter(e: Event) {
      const detail = (e as CustomEvent<{ schoolClassId?: string }>).detail;
      setSchoolClassId(detail?.schoolClassId?.trim() ?? "");
    }
    window.addEventListener(SCHOOL_CLASS_FILTER_EVENT, onFilter);
    return () => window.removeEventListener(SCHOOL_CLASS_FILTER_EVENT, onFilter);
  }, []);

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

  function setClass(id: string) {
    setSchoolClassId(id);
    writeSchoolClassFilterId(id);
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
      <span className="text-slate-600">|</span>
      <label className="flex items-center gap-2 text-slate-400">
        Class
        <select
          disabled={busy}
          value={schoolClassId}
          onChange={(e) => setClass(e.target.value)}
          className="max-w-[14rem] rounded-lg border border-white/15 bg-[#0a101f] px-2 py-1 text-white"
        >
          <option value="">All</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </label>
      <span className="text-xs text-slate-500">
        {schoolTermLabel(context.activeTerm)}
        {schoolClassId ? " · class filter" : " · all classes"} applies to lists
        {classes.length === 0 ? " · no classes yet — add them under School structure" : null}
      </span>
    </div>
  );
}

export function formatUgx(n: number): string {
  return `UGX ${n.toLocaleString("en-UG")}`;
}

"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

type ProgrammeRow = {
  id: string;
  code: string;
  name: string;
  track: string;
  organization: { id: string; slug: string; name: string; tenantStatus: string };
  durationYears: number;
  semestersPerYear: number;
  effectiveDuration: {
    durationYears: number;
    semestersPerYear: number;
    totalSemesters: number;
    source: "configured" | "fee_schedule" | "empty";
  };
  inferredDuration: {
    durationYears: number;
    semestersPerYear: number;
    totalSemesters: number;
    source: "configured" | "fee_schedule" | "empty";
  };
  feeCount: number;
  periods: Array<{
    year: number;
    semester: number;
    feeLineCount: number;
    tuitionUgx: number;
    functionalFeesUgx: number;
    totalUgx: number;
    hasFeeSchedule: boolean;
  }>;
  isUnset: boolean;
};

type OrgOption = { id: string; slug: string; name: string; tenantStatus: string };

type Draft = { durationYears: string; semestersPerYear: string };

export default function MasterProgrammeDurationsPage() {
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgSlugFilter, setOrgSlugFilter] = useState("");
  const [onlyUnset, setOnlyUnset] = useState(true);
  const [rows, setRows] = useState<ProgrammeRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadOrgs = useCallback(async () => {
    const r = await fetch("/api/master/organizations", { credentials: "include" });
    if (!r.ok) return;
    const j = (await r.json()) as { organizations?: OrgOption[] };
    setOrgs((j.organizations ?? []).filter((o) => o.tenantStatus === "active"));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (orgSlugFilter.trim()) params.set("organizationSlug", orgSlugFilter.trim().toLowerCase());
    if (onlyUnset) params.set("onlyUnset", "1");
    const r = await fetch(`/api/master/programmes?${params.toString()}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok) {
      setError((j as { error?: string }).error ?? "Failed to load programmes");
      setRows([]);
      setLoading(false);
      return;
    }
    const list = ((j as { programmes: ProgrammeRow[] }).programmes ?? []);
    setRows(list);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const p of list) {
        if (!next[p.id]) {
          next[p.id] = {
            durationYears: String(p.durationYears || ""),
            semestersPerYear: String(p.semestersPerYear || ""),
          };
        }
      }
      return next;
    });
    setLoading(false);
  }, [orgSlugFilter, onlyUnset]);

  useEffect(() => {
    void loadOrgs();
  }, [loadOrgs]);

  useEffect(() => {
    void load();
  }, [load]);

  const groupedByOrg = useMemo(() => {
    const map = new Map<string, ProgrammeRow[]>();
    for (const row of rows) {
      const key = row.organization.slug;
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  function setDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveRow(row: ProgrammeRow) {
    const draft = drafts[row.id];
    const years = Number(draft?.durationYears ?? "");
    const sems = Number(draft?.semestersPerYear ?? "");
    if (!Number.isInteger(years) || years < 0 || years > 6) {
      setError(`Years must be 0–6 for ${row.code}.`);
      return;
    }
    if (!Number.isInteger(sems) || sems < 0 || sems > 3) {
      setError(`Semesters/year must be 0–3 for ${row.code}.`);
      return;
    }
    setBusyId(row.id);
    setError(null);
    try {
      const r = await fetch(`/api/master/programmes/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationYears: years, semestersPerYear: sems }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Save failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusyId(null);
    }
  }

  function applyInferredToDraft(row: ProgrammeRow) {
    if (row.inferredDuration.totalSemesters === 0) {
      setError(`No fee rows for ${row.code} — set Years and Semesters/year manually.`);
      return;
    }
    setDraft(row.id, {
      durationYears: String(row.inferredDuration.durationYears),
      semestersPerYear: String(row.inferredDuration.semestersPerYear),
    });
  }

  async function bulkApplyInferred(overwriteExisting: boolean) {
    if (
      overwriteExisting &&
      !confirm(
        "Overwrite even programmes that already have explicit Years / Semesters? This replaces them with the value inferred from fee rows.",
      )
    )
      return;
    setBulkBusy(true);
    setBulkMsg(null);
    setError(null);
    try {
      const body: Record<string, unknown> = { overwriteExisting };
      if (orgSlugFilter.trim()) body.organizationSlug = orgSlugFilter.trim().toLowerCase();
      const r = await fetch("/api/master/programmes/apply-inferred", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        scanned?: number;
        updated?: number;
        skippedNoFees?: number;
        skippedAlreadySet?: number;
        error?: string;
      };
      if (!r.ok || !j.ok) throw new Error(j.error ?? "Bulk apply failed");
      setBulkMsg(
        `Scanned ${j.scanned}, updated ${j.updated}. ` +
          `Skipped (no fee rows): ${j.skippedNoFees}, ` +
          `skipped (already set): ${j.skippedAlreadySet}.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk apply failed");
    } finally {
      setBulkBusy(false);
    }
  }

  const totalUnset = rows.filter((r) => r.isUnset).length;

  return (
    <div className="space-y-8 text-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400/90">Programmes</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Years &amp; semesters per year</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Cross-tenant control over how many academic years and semesters per year each programme covers. The
            checkout flow uses these to limit Year / Semester pickers, and the student dashboard uses them to compute{" "}
            <span className="text-slate-300">completed vs remaining periods</span>. Programmes with{" "}
            <strong className="text-amber-200">unset</strong> values fall back to inferring from fee rows; set them
            explicitly here when the fee schedule does not cover the full programme yet.
          </p>
        </div>
        <Link
          href="/admin/master"
          className="rounded-lg border border-amber-500/30 px-3 py-2 text-sm text-amber-100 hover:border-amber-400/50"
        >
          ← Manager overview
        </Link>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <section className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-5">
        <h2 className="text-sm font-semibold text-amber-100">Filter and bulk operations</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-slate-400">
            School (tenant)
            <select
              value={orgSlugFilter}
              onChange={(e) => setOrgSlugFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            >
              <option value="">All active schools</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.slug}>
                  {o.name} ({o.slug})
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-300 sm:mt-6">
            <input
              type="checkbox"
              checked={onlyUnset}
              onChange={(e) => setOnlyUnset(e.target.checked)}
              className="h-4 w-4 rounded border-white/30 text-amber-500"
            />
            Only show programmes with Years or Semesters/year unset
          </label>
          <div className="flex flex-wrap items-end gap-2 sm:mt-2">
            <button
              type="button"
              disabled={bulkBusy || rows.length === 0}
              onClick={() => void bulkApplyInferred(false)}
              className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-500 disabled:opacity-50"
            >
              {bulkBusy ? "Applying…" : "Apply inferred to unset"}
            </button>
            <button
              type="button"
              disabled={bulkBusy || rows.length === 0}
              onClick={() => void bulkApplyInferred(true)}
              className="rounded-md border border-rose-500/40 px-3 py-2 text-sm font-medium text-rose-100 hover:bg-rose-950/40 disabled:opacity-50"
            >
              Overwrite all (force)
            </button>
          </div>
        </div>
        {bulkMsg ? <p className="mt-3 text-sm text-emerald-300">{bulkMsg}</p> : null}
        <p className="mt-3 text-xs text-slate-500">
          “Apply inferred to unset” only touches programmes where Years or Semesters/year is currently 0/blank. Use
          “Overwrite all” only when fees have been re-imported and inferred duration is the authoritative value.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">
            Programmes {loading ? "" : `(${rows.length}${onlyUnset ? ` of ${rows.length + 0}` : ""})`}
          </h2>
          <p className="text-xs text-slate-500">
            {totalUnset} programme{totalUnset === 1 ? "" : "s"} in this view still need explicit values.
          </p>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading programmes…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Nothing to show. Uncheck “Only show unset” to inspect programmes that already have explicit values.
          </p>
        ) : (
          <div className="mt-4 space-y-8">
            {groupedByOrg.map(([slug, list]) => (
              <div key={slug}>
                <h3 className="border-b border-amber-500/20 pb-2 text-sm font-semibold text-amber-100">
                  {list[0]?.organization.name ?? slug}{" "}
                  <span className="ml-1 font-mono text-xs text-slate-500">({slug})</span>
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    · {list.length} programme{list.length === 1 ? "" : "s"}
                  </span>
                </h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">Code</th>
                        <th className="py-2 pr-3">Name</th>
                        <th className="py-2 pr-3">Fees</th>
                        <th className="py-2 pr-3">Years</th>
                        <th className="py-2 pr-3">Sem / year</th>
                        <th className="py-2 pr-3">Inferred</th>
                        <th className="py-2 pr-3">Effective</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((row) => {
                        const draft = drafts[row.id] ?? {
                          durationYears: String(row.durationYears || ""),
                          semestersPerYear: String(row.semestersPerYear || ""),
                        };
                        const effective = row.effectiveDuration;
                        return (
                          <Fragment key={row.id}>
                            <tr className="border-b border-[var(--border)]/70">
                              <td className="py-2 pr-3 font-mono text-cyan-200/90">{row.code}</td>
                              <td className="py-2 pr-3 text-slate-200">
                                {row.name}
                                {row.isUnset ? (
                                  <span className="ml-2 inline-flex rounded border border-amber-400/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                                    Unset
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-2 pr-3 text-slate-400">{row.feeCount}</td>
                              <td className="py-2 pr-3">
                                <input
                                  type="number"
                                  min={0}
                                  max={6}
                                  value={draft.durationYears}
                                  onChange={(e) => setDraft(row.id, { durationYears: e.target.value })}
                                  className="w-16 rounded border border-[var(--border)] bg-[#0d1526] px-2 py-1 text-sm text-white"
                                  aria-label={`Years for ${row.code}`}
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  type="number"
                                  min={0}
                                  max={3}
                                  value={draft.semestersPerYear}
                                  onChange={(e) => setDraft(row.id, { semestersPerYear: e.target.value })}
                                  className="w-16 rounded border border-[var(--border)] bg-[#0d1526] px-2 py-1 text-sm text-white"
                                  aria-label={`Semesters per year for ${row.code}`}
                                />
                              </td>
                              <td className="py-2 pr-3 text-xs text-slate-400">
                                {row.inferredDuration.totalSemesters > 0
                                  ? `${row.inferredDuration.durationYears} yr · ${row.inferredDuration.semestersPerYear} sem`
                                  : "—"}
                              </td>
                              <td className="py-2 pr-3 text-xs">
                                <span
                                  className={
                                    effective.source === "configured"
                                      ? "text-emerald-300"
                                      : effective.source === "fee_schedule"
                                        ? "text-amber-200"
                                        : "text-rose-300"
                                  }
                                >
                                  {effective.totalSemesters > 0
                                    ? `${effective.durationYears} yr · ${effective.semestersPerYear} sem (${effective.source})`
                                    : "no data"}
                                </span>
                              </td>
                              <td className="space-x-2 py-2">
                                <button
                                  type="button"
                                  disabled={busyId === row.id}
                                  onClick={() => void saveRow(row)}
                                  className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-500 disabled:opacity-50"
                                >
                                  {busyId === row.id ? "Saving…" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyInferredToDraft(row)}
                                  className="rounded-md border border-cyan-500/40 px-2.5 py-1 text-xs font-medium text-cyan-100 hover:bg-cyan-950/40"
                                  title="Fill the inputs with the inferred values from fee rows"
                                >
                                  Use inferred
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                                  className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/5"
                                >
                                  {expandedId === row.id ? "Hide periods" : "Periods"}
                                </button>
                              </td>
                            </tr>
                            {expandedId === row.id ? (
                              <tr className="border-b border-[var(--border)]/70 bg-black/20">
                                <td colSpan={8} className="px-3 py-3">
                                  {row.periods.length === 0 ? (
                                    <p className="text-xs text-slate-500">
                                      No periods yet — set Years &amp; Semesters/year to see the grid.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                      {row.periods.map((period) => (
                                        <div
                                          key={`${period.year}-${period.semester}`}
                                          className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-2 text-xs"
                                        >
                                          <p className="font-medium text-slate-100">
                                            Year {period.year} · Sem {period.semester}
                                          </p>
                                          <p className="mt-0.5 text-slate-500">
                                            {period.hasFeeSchedule
                                              ? `${period.feeLineCount} fee line(s) · UGX ${period.totalUgx.toLocaleString()}`
                                              : "No fee rows yet"}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

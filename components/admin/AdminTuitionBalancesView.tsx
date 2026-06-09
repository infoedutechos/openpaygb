"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  TuitionBalancePanel,
  type TuitionBalanceData,
  type BalanceProgrammeProgress,
} from "@/components/tuition/TuitionBalancePanel";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";
import { useTuitionAdminGate } from "@/hooks/useTuitionAdminGate";

type StudentBalanceRow = {
  id: string;
  name: string;
  email: string;
  programmeCode: string;
  year: number;
  semester: number;
  organizationSlug: string;
  organizationName: string;
  outstandingUgx: number;
  activeInstallmentPlans: number;
  progress: BalanceProgrammeProgress | null;
  balance: TuitionBalanceData | null;
};

type Props = {
  /** When true, show school column and org slug filter (master console page). */
  masterLayout?: boolean;
  studentDetailBase?: string;
};

export function AdminTuitionBalancesView({
  masterLayout = false,
  studentDetailBase = "/admin/students",
}: Props) {
  const { orgSlug, setOrgSlug } = useMasterOrgSlug();
  const { loading: authLoading, ensureTuitionSession } = useTuitionAdminGate();
  const [rows, setRows] = useState<StudentBalanceRow[]>([]);
  const [isMaster, setIsMaster] = useState(false);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    const gate = ensureTuitionSession({
      message: "Sign in as school or master admin to view tuition balances.",
    });
    if (!gate.ok) {
      if (gate.error) setError(gate.error);
      setLoading(false);
      return;
    }
    const masterRole = gate.auth.admin?.role === "master";
    setIsMaster(masterRole);
    setLoading(true);
    setError(null);
    try {
      const qp = new URLSearchParams();
      qp.set("limit", "80");
      if (q.trim()) qp.set("q", q.trim());
      if (masterRole) {
        const slug = orgSlug.trim().toLowerCase();
        if (slug) qp.set("organizationSlug", slug);
      }
      const r = await fetch(`/api/admin/tuition-balances?${qp.toString()}`, { credentials: "include" });
      const j = (await r.json()) as { error?: string; students?: StudentBalanceRow[]; isMaster?: boolean };
      if (!r.ok) throw new Error(j.error ?? "Failed to load balances");
      setRows(j.students ?? []);
      if (typeof j.isMaster === "boolean") setIsMaster(j.isMaster);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, ensureTuitionSession, q, orgSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const showOrgColumn = masterLayout || isMaster;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400/90">Tuition</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Tuition balance</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Paid vs remaining by year, semester, and installment plan. Expand a student for the full balance panel or open
          their record for payments and receipts.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-500">
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, programme…"
            className="mt-1 block w-56 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        {showOrgColumn ? (
          <label className="text-xs text-slate-500">
            School slug (master)
            <input
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              placeholder="e.g. default"
              className="mt-1 block w-40 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          Refresh
        </button>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Loading tuition balances…</p> : null}

      {!loading && rows.length === 0 ? (
        <p className="text-sm text-slate-500">No students match your search.</p>
      ) : null}

      <ul className="space-y-3">
        {rows.map((row) => {
          const expanded = expandedId === row.id;
          const progress = row.progress;
          return (
            <li
              key={row.id}
              className="rounded-xl border border-white/10 bg-[var(--card)]/80 overflow-hidden"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-white">{row.name}</p>
                  <p className="text-xs text-slate-500">
                    {row.programmeCode} · Y{row.year} S{row.semester}
                    {showOrgColumn ? ` · ${row.organizationName}` : ""}
                  </p>
                  {progress ? (
                    <p className="mt-1 text-xs text-slate-400">
                      {progress.completedSemesters}/{progress.totalSemesters} semesters paid ·{" "}
                      {progress.remainingSemesters} remaining
                      {row.activeInstallmentPlans > 0
                        ? ` · ${row.activeInstallmentPlans} active installment plan(s)`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-right">
                  <p className="text-sm font-semibold tabular-nums text-amber-200">
                    {row.outstandingUgx > 0
                      ? `UGX ${row.outstandingUgx.toLocaleString()} outstanding`
                      : "Fully paid / no open balance"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                    className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
                  >
                    {expanded ? "Hide panel" : "Balance panel"}
                  </button>
                  <Link
                    href={`${studentDetailBase}/${row.id}`}
                    className="rounded-lg bg-cyan-600/80 px-2 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
                  >
                    Student record
                  </Link>
                </div>
              </div>
              {expanded && row.balance ? (
                <div className="border-t border-white/10 px-4 py-4">
                  <TuitionBalancePanel balance={row.balance} variant="admin" />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

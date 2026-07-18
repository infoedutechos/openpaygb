"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { useSchoolClassFilter } from "@/hooks/useSchoolClassFilter";

type Row = {
  studentId: string;
  name: string;
  admissionNo: string;
  classCode: string | null;
  debtBalanceUgx: number;
  lastPaymentDate: string | null;
  lastReceiptNo: string | null;
  tab: string;
};

const TABS = [
  { id: "all_due", label: "All due defaulters", subtitle: "Students with any outstanding balance for the active term." },
  { id: "overdue", label: "Overdue defaulters", subtitle: "No payment recorded, or last payment more than 10 days ago." },
  { id: "responding", label: "Responding defaulters", subtitle: "Partial payment within the last 10 days — still owing." },
  { id: "non_defaulters", label: "Non-defaulters", subtitle: "Cleared or current for the active term." },
] as const;

export default function DefaultersPage() {
  const { schoolFetch, schoolUrl, needsOrgSlug } = useSchoolAdminApi();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all_due");
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [schoolClassId] = useSchoolClassFilter();

  const load = useCallback(async () => {
    if (needsOrgSlug) return;
    const r = await schoolFetch("/api/admin/school/defaulters", undefined, {
      tab,
      ...(schoolClassId ? { schoolClassId } : {}),
    });
    if (!r.ok) return;
    const j = (await r.json()) as { rows?: Row[] };
    setRows(j.rows ?? []);
  }, [needsOrgSlug, schoolFetch, tab, schoolClassId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));

  const groupedRows = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const key = r.classCode ?? "UNASSIGNED";
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const activeTab = TABS.find((t) => t.id === tab)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Defaulters</h1>
        <p className="text-sm text-slate-400">{activeTab.subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-sm ${tab === t.id ? "bg-cyan-900/50 text-cyan-100 ring-1 ring-cyan-400/30" : "text-slate-400 hover:bg-white/5"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              window.location.href = schoolUrl("/api/admin/school/defaulters/export", {
                tab,
                format: "csv",
                ...(schoolClassId ? { schoolClassId } : {}),
              });
            }}
            className="text-sm text-cyan-300 underline"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = schoolUrl("/api/admin/school/defaulters/export", {
                tab,
                format: "pdf",
                ...(schoolClassId ? { schoolClassId } : {}),
              });
            }}
            className="text-sm text-emerald-300 underline"
          >
            Export PDF
          </button>
        </div>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name…"
        className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
      />
      <div className="space-y-4 md:hidden">
        {groupedRows.map(([classCode, classRows]) => {
          const totalDebt = classRows.reduce((s, r) => s + r.debtBalanceUgx, 0);
          return (
            <div key={classCode}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                {classCode} — {classRows.length} · {formatUgx(totalDebt)}
              </p>
              {classRows.map((r) => (
                <article key={r.studentId} className="mb-2 rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm text-slate-200">
                  <p className="font-medium text-white">{r.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{r.admissionNo || "—"}</p>
                  <p className="mt-2 text-rose-200">{formatUgx(r.debtBalanceUgx)}</p>
                  <p className="mt-1 text-xs text-slate-500">Last pay: {r.lastPaymentDate ?? "—"} · {r.lastReceiptNo ?? "—"}</p>
                </article>
              ))}
            </div>
          );
        })}
        {groupedRows.length === 0 ? (
          <p className="text-center text-sm text-slate-500">No records for this tab.</p>
        ) : null}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-slate-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Admission</th>
              <th className="px-4 py-2">Debt</th>
              <th className="px-4 py-2">Last payment</th>
              <th className="px-4 py-2">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {groupedRows.map(([classCode, classRows]) => {
              const totalDebt = classRows.reduce((s, r) => s + r.debtBalanceUgx, 0);
              return (
                <Fragment key={classCode}>
                  <tr className="bg-cyan-950/30 text-cyan-100">
                    <td colSpan={5} className="px-4 py-2 font-semibold">
                      {classCode} — {classRows.length} defaulter(s) — {formatUgx(totalDebt)}
                    </td>
                  </tr>
                  {classRows.map((r) => (
                    <tr key={r.studentId} className="border-t border-white/10 text-slate-200">
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2 text-slate-400">{r.admissionNo || "—"}</td>
                      <td className="px-4 py-2">{formatUgx(r.debtBalanceUgx)}</td>
                      <td className="px-4 py-2">{r.lastPaymentDate ?? "—"}</td>
                      <td className="px-4 py-2">{r.lastReceiptNo ?? "—"}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
            {groupedRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No records for this tab.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

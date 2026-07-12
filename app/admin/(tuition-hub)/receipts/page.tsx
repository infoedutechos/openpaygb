"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ReceiptPreviewModal } from "@/components/admin/ReceiptPreviewModal";
import { TuitionHubCheckoutExplainerCompact } from "@/components/admin/TuitionHubCheckoutExplainer";
import type { BalanceProgrammeProgress } from "@/components/tuition/TuitionBalancePanel";
import { useTuitionAdminGate } from "@/hooks/useTuitionAdminGate";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { schoolTermLabel } from "@/lib/school-term";

type Row = {
  id: string;
  studentName: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode?: string;
  tonAmount: number;
  totalUgx: number;
  createdAt: string;
  paymentMode?: string;
  schoolReceiptNo?: string;
  schoolClassCode?: string | null;
  progress?: BalanceProgrammeProgress | null;
};

function displayReceiptNo(p: Row, index: number): string {
  return p.schoolReceiptNo || receiptNo(p.id, index);
}

function programmeLabel(code: string, year: number, semester: number, mode?: string, isSchool?: boolean): string {
  const short = (code.split(/[-/]/)[0] ?? code).trim();
  if (isSchool) return `${short} · ${schoolTermLabel(semester)}`;
  return `${short} Yr${year} Sem${semester}${mode === "year" ? " (year bundle)" : ""}`;
}

function receiptNo(id: string, index: number): string {
  return `RP-${id.slice(-6).toUpperCase()}-${String(index + 1).padStart(3, "0")}`;
}

export default function AdminReceiptsPage() {
  const { loading: authLoading, ensureTuitionSession } = useTuitionAdminGate();
  const { data: authMe } = useAuthMe();
  const { schoolFetch, schoolUrl } = useSchoolAdminApi();
  const isSchoolTenant = authMe?.admin?.organization?.institutionTier === "school";
  const [rows, setRows] = useState<Row[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    setError(null);
    const gate = ensureTuitionSession({
      message:
        "Sign in with your tuition hub admin account (email and password) to view receipts. Open Admin login from the sidebar.",
    });
    if (!gate.ok) {
      if (gate.error) setError(gate.error);
      if (!gate.redirecting) setRows([]);
      return;
    }
    const r = isSchoolTenant
      ? await schoolFetch("/api/admin/school/receipts", undefined, { limit: 100 })
      : await fetch("/api/payments?limit=100&status=confirmed", { credentials: "include" });
    const j = await r.json();
    if (isSchoolTenant) {
      setRows(
        (j.receipts ?? []).map(
          (p: {
            id: string;
            studentName: string;
            classCode: string | null;
            term: number;
            paymentMode: string;
            totalUgx: number;
            date: string;
            receiptNo: string;
          }) => ({
            id: p.id,
            studentName: p.studentName,
            programmeCode: p.classCode ?? "",
            year: 1,
            semester: p.term,
            totalUgx: p.totalUgx,
            createdAt: p.date,
            paymentMode: p.paymentMode,
            schoolReceiptNo: p.receiptNo,
            schoolClassCode: p.classCode,
            tonAmount: 0,
          }),
        ),
      );
      return;
    }
    setRows(
      (j.payments ?? []).map(
        (p: {
          id: string;
          studentName: string;
          programmeCode: string;
          year: number;
          semester: number;
          feeSelectionMode?: string;
          tonAmount: number;
          totalUgx: number;
          createdAt: string;
          paymentMode?: string;
          schoolReceiptNo?: string;
          schoolClassCode?: string | null;
          progress?: BalanceProgrammeProgress | null;
        }) => ({
          id: p.id,
          studentName: p.studentName,
          programmeCode: p.programmeCode,
          year: p.year,
          semester: p.semester,
          feeSelectionMode: p.feeSelectionMode,
          tonAmount: p.tonAmount,
          totalUgx: p.totalUgx,
          createdAt: p.createdAt,
          paymentMode: p.paymentMode,
          schoolReceiptNo: p.schoolReceiptNo,
          schoolClassCode: p.schoolClassCode,
          progress: p.progress,
        })
      )
    );
  }, [authLoading, ensureTuitionSession, isSchoolTenant, schoolFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {isSchoolTenant ? "Receipt of payments" : "Receipts"}
        </h1>
        <p className="text-sm text-slate-400">
          Confirmed payments — preview the official receipt (line items, processing UGX, TON) or open the public receipt
          page. Same totals as Payments and exports.
        </p>
        <TuitionHubCheckoutExplainerCompact className="mt-2 max-w-3xl" />
      </div>
      {isSchoolTenant ? (
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/students" className="rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white">
            Record payment (Students → Pay bill)
          </Link>
          <button
            type="button"
            onClick={() => { window.location.href = schoolUrl("/api/admin/school/receipts/export"); }}
            className="rounded-lg border border-white/15 px-3 py-2 text-cyan-300"
          >
            Export Excel (CSV)
          </button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <div className="space-y-3 md:hidden">
        {rows.map((p, i) => (
          <article
            key={p.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-slate-200"
          >
            <p className="font-medium text-white">{p.studentName}</p>
            {isSchoolTenant ? (
              <p className="mt-1 font-mono text-xs text-slate-500">{displayReceiptNo(p, i)}</p>
            ) : null}
            <p className="mt-1 text-xs text-slate-400">
              {isSchoolTenant && p.schoolClassCode ? `${p.schoolClassCode} · ` : ""}
              {programmeLabel(p.programmeCode, p.year, p.semester, p.feeSelectionMode, isSchoolTenant)}
            </p>
            {isSchoolTenant && p.paymentMode ? (
              <p className="mt-1 text-xs text-emerald-300/90">{p.paymentMode}</p>
            ) : null}
            <p className="mt-2 font-mono text-cyan-200/90">
              {p.tonAmount} TON · UGX {p.totalUgx.toLocaleString()}
            </p>
            {p.progress ? (
              <p className="mt-1 text-xs text-slate-500">
                {p.progress.completedSemesters}/{p.progress.totalSemesters} semesters complete ·{" "}
                {p.progress.remainingSemesters} remaining
              </p>
            ) : null}
            <p className="mt-1 text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPreviewId(p.id)}
                className="min-h-[44px] text-xs font-semibold text-sky-400"
              >
                Preview
              </button>
              <Link
                href={`/receipt/${p.id}`}
                className="inline-flex min-h-[44px] items-center text-xs text-slate-400"
                target="_blank"
              >
                Public
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] md:block">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="border-b border-[var(--border)] text-xs uppercase text-slate-500">
            <tr>
              {isSchoolTenant ? <th className="px-3 py-2">Receipt no.</th> : null}
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">{isSchoolTenant ? "Class / term" : "Programme"}</th>
              {isSchoolTenant ? <th className="px-3 py-2">Payment mode</th> : null}
              <th className="px-3 py-2" title="Quoted total in UGX (includes processing when charged)">
                UGX total
              </th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id} className="border-b border-[var(--border)]/60">
                {isSchoolTenant ? (
                  <td className="px-3 py-2 font-mono text-xs text-slate-400">{displayReceiptNo(p, i)}</td>
                ) : null}
                <td className="px-3 py-2">{p.studentName}</td>
                <td className="px-3 py-2 text-slate-400">
                  <p>
                    {isSchoolTenant && p.schoolClassCode ? `${p.schoolClassCode} · ` : ""}
                    {programmeLabel(p.programmeCode, p.year, p.semester, p.feeSelectionMode, isSchoolTenant)}
                  </p>
                  {p.progress ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {p.progress.completedSemesters}/{p.progress.totalSemesters} semesters complete ·{" "}
                      {p.progress.remainingSemesters} remaining
                    </p>
                  ) : null}
                </td>
                {isSchoolTenant ? (
                  <td className="px-3 py-2 text-xs text-emerald-300/90">{p.paymentMode || (p.tonAmount > 0 ? "ONLINE" : "—")}</td>
                ) : null}
                <td className="px-3 py-2">
                  <span className="font-mono text-cyan-200/90">{p.tonAmount} TON</span>
                  <span className="ml-2 text-slate-500">UGX {p.totalUgx.toLocaleString()}</span>
                </td>
                <td className="px-3 py-2 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="space-x-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setPreviewId(p.id)}
                    className="text-xs font-semibold text-sky-400 hover:underline"
                  >
                    Preview
                  </button>
                  <Link href={`/receipt/${p.id}`} className="text-xs text-slate-400 hover:text-sky-300" target="_blank">
                    Public
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReceiptPreviewModal paymentId={previewId} open={previewId !== null} onClose={() => setPreviewId(null)} />
    </div>
  );
}

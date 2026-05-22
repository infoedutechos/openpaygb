"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ReceiptPreviewModal } from "@/components/admin/ReceiptPreviewModal";
import { TuitionHubCheckoutExplainerCompact } from "@/components/admin/TuitionHubCheckoutExplainer";
import type { BalanceProgrammeProgress } from "@/components/tuition/TuitionBalancePanel";
import { useTuitionAdminGate } from "@/hooks/useTuitionAdminGate";

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
  progress?: BalanceProgrammeProgress | null;
};

function programmeLabel(code: string, year: number, semester: number, mode?: string): string {
  const short = (code.split(/[-/]/)[0] ?? code).trim();
  return `${short} Yr${year} Sem${semester}${mode === "year" ? " (year bundle)" : ""}`;
}

export default function AdminReceiptsPage() {
  const { loading: authLoading, ensureTuitionSession } = useTuitionAdminGate();
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
    const r = await fetch("/api/payments?limit=100&status=confirmed", { credentials: "include" });
    const j = await r.json();
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
          progress: p.progress,
        })
      )
    );
  }, [authLoading, ensureTuitionSession]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Receipts</h1>
        <p className="text-sm text-slate-400">
          Confirmed payments — preview the official receipt (line items, processing UGX, TON) or open the public receipt
          page. Same totals as Payments and exports.
        </p>
        <TuitionHubCheckoutExplainerCompact className="mt-2 max-w-3xl" />
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <div className="space-y-3 md:hidden">
        {rows.map((p) => (
          <article
            key={p.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-slate-200"
          >
            <p className="font-medium text-white">{p.studentName}</p>
            <p className="mt-1 text-xs text-slate-400">
              {programmeLabel(p.programmeCode, p.year, p.semester, p.feeSelectionMode)}
            </p>
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
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Programme</th>
              <th className="px-3 py-2" title="Quoted total in UGX (includes processing when charged)">
                UGX total
              </th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)]/60">
                <td className="px-3 py-2">{p.studentName}</td>
                <td className="px-3 py-2 text-slate-400">
                  <p>{programmeLabel(p.programmeCode, p.year, p.semester, p.feeSelectionMode)}</p>
                  {p.progress ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {p.progress.completedSemesters}/{p.progress.totalSemesters} semesters complete ·{" "}
                      {p.progress.remainingSemesters} remaining
                    </p>
                  ) : null}
                </td>
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

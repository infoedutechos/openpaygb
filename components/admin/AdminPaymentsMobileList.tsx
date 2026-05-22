"use client";

import Link from "next/link";
import type { BalanceProgrammeProgress } from "@/components/tuition/TuitionBalancePanel";

type PaymentRow = {
  id: string;
  studentName: string;
  studentId: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode?: string;
  totalUgx: number;
  tonAmount: number;
  txHash: string;
  status: string;
  rail: string;
  createdAt: string;
  organizationSlug?: string;
  organizationName?: string;
  progress?: BalanceProgrammeProgress | null;
};

function abbrevTx(s: string, head = 4, tail = 4): string {
  const t = s.trim();
  if (!t) return "—";
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

function programmeLabel(code: string, year: number, semester: number, mode?: string): string {
  const short = (code.split(/[-/]/)[0] ?? code).trim();
  const bundle =
    mode === "programme" ? " (full programme bundle)" : mode === "year" ? " (year bundle)" : "";
  return `${short} Yr${year} Sem${semester}${bundle}`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "confirmed") {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white"
        title="Confirmed"
      >
        ✓
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-900"
        title="Pending"
      >
        …
      </span>
    );
  }
  return <span className="text-xs text-slate-500">{status}</span>;
}

type Props = {
  loading: boolean;
  rows: PaymentRow[];
  isMaster: boolean;
  manualConfirmAllowed: boolean;
  cancellingId: string | null;
  refundingId: string | null;
  onCancel: (id: string) => void;
  onConfirm: (row: PaymentRow) => void;
  onReceipt: (id: string) => void;
  onRefund: (id: string) => void;
};

export function AdminPaymentsMobileList({
  loading,
  rows,
  isMaster,
  manualConfirmAllowed,
  cancellingId,
  refundingId,
  onCancel,
  onConfirm,
  onReceipt,
  onRefund,
}: Props) {
  if (loading) {
    return <p className="py-8 text-center text-sm text-slate-500 md:hidden">Loading payments…</p>;
  }
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500 md:hidden">No payments found.</p>;
  }
  return (
    <div className="space-y-3 md:hidden">
      {rows.map((p) => (
        <article
          key={p.id}
          className="rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <Link href={`/admin/students/${p.studentId}`} className="font-medium text-slate-900 hover:text-blue-600">
              {p.studentName || "—"}
            </Link>
            <StatusIcon status={p.status} />
          </div>
          {isMaster && p.organizationSlug ? (
            <p className="mt-1 text-xs text-slate-600">
              {p.organizationName ?? "—"}
              <span className="ml-1 font-mono text-slate-400">({p.organizationSlug})</span>
            </p>
          ) : null}
          <p className="mt-2 text-sm text-slate-700">{programmeLabel(p.programmeCode, p.year, p.semester, p.feeSelectionMode)}</p>
          {p.progress ? (
            <p className="mt-1 text-xs text-slate-500">
              {p.progress.completedSemesters}/{p.progress.totalSemesters} semesters complete · {p.progress.remainingYears} year(s),{" "}
              {p.progress.remainingSemesters} semester(s) remaining
            </p>
          ) : null}
          <p className="mt-1 text-sm">
            UGX {p.totalUgx.toLocaleString()} · <span className="font-mono">{p.tonAmount.toFixed(2)} TON</span>
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500" title={p.txHash || undefined}>
            {abbrevTx(p.txHash)}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {p.status === "pending" ? (
              <>
                <button
                  type="button"
                  disabled={cancellingId === p.id}
                  onClick={() => onCancel(p.id)}
                  className="min-h-[44px] text-xs font-medium text-rose-600"
                >
                  {cancellingId === p.id ? "Cancelling…" : "Cancel"}
                </button>
                {manualConfirmAllowed ? (
                  <button
                    type="button"
                    onClick={() => onConfirm(p)}
                    className="min-h-[44px] text-xs font-medium text-emerald-700"
                  >
                    Confirm
                  </button>
                ) : null}
              </>
            ) : null}
            {p.status === "confirmed" ? (
              <>
                <button
                  type="button"
                  onClick={() => onReceipt(p.id)}
                  className="min-h-[44px] text-xs font-medium text-blue-600"
                >
                  Receipt
                </button>
                <button
                  type="button"
                  disabled={refundingId === p.id}
                  onClick={() => onRefund(p.id)}
                  className="min-h-[44px] text-xs font-medium text-amber-700 disabled:opacity-50"
                >
                  {refundingId === p.id ? "Refunding…" : "Refund"}
                </button>
              </>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { ReceiptPreviewModal } from "@/components/admin/ReceiptPreviewModal";

export type StudentPaymentRow = {
  id: string;
  status: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode?: string;
  totalUgx: number;
  tonAmount: number;
  txHash: string;
  createdAt: string;
  confirmedAt?: string | null;
};

function abbrevTx(s: string, head = 4, tail = 4): string {
  const t = s.trim();
  if (!t) return "—";
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
        Confirmed
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/20 px-2 py-0.5 text-xs font-medium text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" aria-hidden />
        Pending
      </span>
    );
  }
  return <span className="text-xs text-rose-300">{status}</span>;
}

function programmeLabel(code: string, year: number, semester: number, mode?: string): string {
  const short = (code.split(/[-/]/)[0] ?? code).trim();
  return `${short} Yr${year} Sem${semester}${mode === "year" ? " (year bundle)" : ""}`;
}

function PaymentActions({
  p,
  onPreview,
}: {
  p: StudentPaymentRow;
  onPreview: (id: string) => void;
}) {
  if (p.status === "confirmed") {
    return (
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onPreview(p.id)}
          className="min-h-[44px] rounded-md bg-sky-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500"
        >
          View Receipt
        </button>
        <a
          href={`/api/receipts/${p.id}/pdf`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-[var(--border)] px-3 text-slate-300 hover:border-sky-500/50"
          title="Download PDF"
        >
          Download PDF
        </a>
      </div>
    );
  }
  return (
    <Link href="/admin/payments" className="mt-3 inline-flex min-h-[44px] items-center text-xs text-sky-400 hover:underline">
      Manage in payments
    </Link>
  );
}

export function StudentPaymentTable({ payments }: { payments: StudentPaymentRow[] }) {
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (payments.length === 0) {
    return <p className="text-sm text-slate-500">No payments yet.</p>;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {payments.map((p) => (
          <article
            key={p.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-slate-200"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</p>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-2 font-medium text-white">UGX {p.totalUgx.toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-400">
              {programmeLabel(p.programmeCode, p.year, p.semester, p.feeSelectionMode)}
            </p>
            <p className="mt-1 font-mono text-xs text-cyan-200/90">{p.tonAmount} TON</p>
            <p className="mt-1 font-mono text-xs text-slate-500 break-all" title={p.txHash}>
              {abbrevTx(p.txHash, 8, 8)}
            </p>
            <PaymentActions p={p} onPreview={setPreviewId} />
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] md:block">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="border-b border-[var(--border)] text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Programme</th>
              <th
                className="px-3 py-2"
                title="Recorded total in UGX (fee subtotal + checkout processing when charged)"
              >
                UGX total
              </th>
              <th className="px-3 py-2">TON</th>
              <th className="px-3 py-2">Tx Hash</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)]/60">
                <td className="px-3 py-2 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-slate-300">
                  {programmeLabel(p.programmeCode, p.year, p.semester, p.feeSelectionMode)}
                </td>
                <td className="px-3 py-2">UGX {p.totalUgx.toLocaleString()}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.tonAmount}</td>
                <td className="max-w-[120px] truncate px-3 py-2 font-mono text-xs text-slate-500" title={p.txHash}>
                  {abbrevTx(p.txHash)}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.status === "confirmed" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewId(p.id)}
                          className="rounded-md bg-sky-600/90 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-500"
                        >
                          View Receipt
                        </button>
                        <a
                          href={`/api/receipts/${p.id}/pdf`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-slate-300 hover:border-sky-500/50"
                          title="Download PDF"
                          aria-label="Download receipt PDF"
                        >
                          ↓
                        </a>
                      </>
                    ) : (
                      <Link href="/admin/payments" className="text-xs text-sky-400 hover:underline">
                        Manage
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReceiptPreviewModal paymentId={previewId} open={previewId !== null} onClose={() => setPreviewId(null)} />
    </>
  );
}

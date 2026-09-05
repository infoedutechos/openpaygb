"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ReceiptPreviewModal } from "@/components/admin/ReceiptPreviewModal";
import type { StudentPaymentRow } from "@/components/admin/StudentPaymentTable";
import { TuitionBalancePanel, type TuitionBalanceData } from "@/components/tuition/TuitionBalancePanel";
import { StudentPortalPasswordForm } from "@/components/admin/StudentPortalPasswordForm";
import { StudentShareCard } from "@/components/admin/StudentShareCard";

function programmeLabel(code: string, year: number, semester: number): string {
  const short = (code.split(/[-/]/)[0] ?? code).trim();
  return `${short} - Y${year} Semester ${semester}`;
}

function paymentProgrammeLabel(p: StudentPaymentRow): string {
  const short = (p.programmeCode.split(/[-/]/)[0] ?? p.programmeCode).trim();
  const bundle =
    p.feeSelectionMode === "programme"
      ? " (full programme bundle)"
      : p.feeSelectionMode === "year"
      ? " (year bundle)"
      : "";
  return `${short} Yr${p.year} Sem${p.semester}${bundle}`;
}

function abbrevTx(s: string, head = 4, tail = 4): string {
  const t = s.trim();
  if (!t) return "—";
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusConfirmed() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-200">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      Confirmed
    </span>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 2a.75.75 0 01.75.75v7.59l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V2.75A.75.75 0 0110 2z" />
      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
  );
}

export type StudentDetailProps = {
  student: {
    id: string;
    name: string;
    admissionNo?: string;
    email: string;
    phone: string;
    programmeCode: string;
    year: number;
    semester: number;
    organizationName: string;
    organizationSlug: string;
    schoolPayCode?: string;
    cardUrl?: string;
    periodLabel?: string;
    portalSignInEnabled?: boolean;
  };
  totalTon: number;
  totalUgx: number;
  payments: StudentPaymentRow[];
  balance?: TuitionBalanceData | null;
  openPayCardEnabled?: boolean;
  openPayCard?: {
    status: string;
    maskedPan: string;
    balanceUgx: number;
    issuedAt: string | null;
    topupCount: number;
  } | null;
};

function openPayCardStatusLabel(status: string): string {
  if (status === "active") return "Active";
  if (status === "pending_issue") return "Pending issue";
  return status.replace(/_/g, " ");
}

export function StudentDetailView({
  student,
  totalTon,
  totalUgx,
  payments,
  balance,
  openPayCardEnabled = false,
  openPayCard = null,
}: StudentDetailProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const defaultReceiptId = useMemo(() => {
    const confirmed = payments.find((p) => p.status === "confirmed");
    return confirmed?.id ?? payments[0]?.id ?? null;
  }, [payments]);

  const activeReceiptId = selectedPaymentId ?? defaultReceiptId;
  const activePayment = payments.find((p) => p.id === activeReceiptId);

  return (
    <div className="space-y-5 text-slate-100">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/students" className="text-sm font-medium text-cyan-300 hover:underline">
          ← Students / bills
        </Link>
        {student.periodLabel === "Term" ? (
          <>
            <Link
              href={`/admin/students?payStudentId=${encodeURIComponent(student.id)}&payStudentName=${encodeURIComponent(student.name)}`}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Pay bill
            </Link>
            <Link
              href={`/admin/fee-ledger?studentId=${encodeURIComponent(student.id)}&returnPay=1&studentName=${encodeURIComponent(student.name)}`}
              className="rounded-lg border border-violet-500/40 bg-violet-950/40 px-3 py-1.5 text-sm font-semibold text-violet-100 hover:border-violet-400/60"
            >
              Fee ledger
            </Link>
          </>
        ) : null}
      </div>

      <article className="rounded-xl border border-white/10 bg-[#0a101f] p-6 shadow-sm text-slate-100">
        <div className="flex flex-wrap gap-5">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xl font-semibold text-cyan-100 ring-1 ring-cyan-400/30"
            aria-hidden
          >
            {student.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white">{student.name}</h1>
            <p className="mt-0.5 text-sm text-slate-300">
              {programmeLabel(student.programmeCode, student.year, student.semester)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {student.organizationName}{" "}
              <span className="font-mono text-cyan-200/80">({student.organizationSlug})</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {student.admissionNo ? (
                <li className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400">Admission / registration no.</span>
                  <span className="font-mono font-semibold tracking-wide text-white">
                    {student.admissionNo}
                  </span>
                </li>
              ) : null}
              {student.phone ? (
                <li className="flex items-center gap-2">
                  <span className="text-slate-400" aria-hidden>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.614.614l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.34 0-4.52-.64-6.39-1.75l-.45-.27-4.74 1.59 1.59-4.74-.27-.45A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                    </svg>
                  </span>
                  {student.phone}
                </li>
              ) : null}
              {student.email ? (
                <li className="flex items-center gap-2">
                  <span className="text-slate-400" aria-hidden>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16v12H4z" />
                      <path d="M4 8l8 5 8-5" />
                    </svg>
                  </span>
                  {student.email}
                </li>
              ) : null}
            </ul>
            <StudentPortalPasswordForm
              studentId={student.id}
              studentEmail={student.email}
              portalSignInEnabled={Boolean(student.portalSignInEnabled)}
            />
          </div>
        </div>

        {student.admissionNo && student.cardUrl ? (
          <div className="mt-6">
            <StudentShareCard
              variant="panel"
              student={{
                id: student.id,
                name: student.name,
                admissionNo: student.admissionNo,
                programmeCode: student.programmeCode,
                year: student.year,
                semester: student.semester,
                organizationName: student.organizationName,
                organizationSlug: student.organizationSlug,
                schoolPayCode: student.schoolPayCode,
                cardUrl: student.cardUrl,
                periodLabel: student.periodLabel,
              }}
            />
          </div>
        ) : null}

        {openPayCardEnabled ? (
          <div className="mt-6 rounded-lg border border-indigo-400/30 bg-indigo-950/40 px-5 py-4">
            <p className="text-sm font-semibold text-indigo-100">OpenPayGB virtual card</p>
            {openPayCard ? (
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-indigo-300/80">Card</dt>
                  <dd className="mt-0.5 font-mono text-indigo-50">{openPayCard.maskedPan || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-indigo-300/80">Status</dt>
                  <dd className="mt-0.5 text-indigo-50">{openPayCardStatusLabel(openPayCard.status)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-indigo-300/80">Balance</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-indigo-50">
                    UGX {openPayCard.balanceUgx.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-indigo-300/80">Top-ups</dt>
                  <dd className="mt-0.5 text-indigo-50">{openPayCard.topupCount}</dd>
                </div>
                {openPayCard.issuedAt ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-indigo-300/80">Issued</dt>
                    <dd className="mt-0.5 text-indigo-50">{formatDate(openPayCard.issuedAt)}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-indigo-200/90">
                This student has not opted in to an OpenPayGB card yet.
              </p>
            )}
            <p className="mt-3 text-xs text-indigo-300/80">
              Read-only view for school admins. Students manage top-ups from their portal.
            </p>
          </div>
        ) : null}

        {balance ? (
          <div className="mt-6">
            <TuitionBalancePanel
              balance={balance}
              variant="admin"
              onPayInstallment={() => {
                window.location.href = `/pay/${encodeURIComponent(student.organizationSlug)}?studentId=${encodeURIComponent(student.id)}`;
              }}
            />
          </div>
        ) : null}

        <div className="mt-8 rounded-lg border border-white/10 bg-black/30 px-5 py-4">
          <p className="text-sm font-medium text-slate-400">Total Payments</p>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-6">
            <p className="text-2xl font-semibold text-white">{totalTon.toFixed(2)} TON</p>
            <p className="text-2xl font-semibold text-white">UGX {totalUgx.toLocaleString()}</p>
          </div>
        </div>

        <h2 className="mt-8 text-base font-semibold text-white">Payment History</h2>

        <div className="mt-4 space-y-3 md:hidden">
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No payments yet.</p>
          ) : (
            payments.map((p) => {
              const selected = p.id === activeReceiptId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPaymentId(p.id)}
                  className={`w-full rounded-xl border p-4 text-left text-sm transition-colors ${
                    selected
                      ? "border-cyan-400/40 bg-cyan-950/40"
                      : "border-white/10 bg-black/20 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-slate-200">{formatDate(p.createdAt)}</p>
                    {p.status === "confirmed" ? <StatusConfirmed /> : (
                      <span className="text-xs capitalize text-slate-400">{p.status}</span>
                    )}
                  </div>
                  <p className="mt-2 font-semibold text-white">UGX {p.totalUgx.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-slate-400">{paymentProgrammeLabel(p)}</p>
                  <p className="mt-1 font-mono text-slate-200">{p.tonAmount.toFixed(2)} TON</p>
                  <p className="mt-1 font-mono text-xs text-slate-500 break-all" title={p.txHash}>
                    {abbrevTx(p.txHash, 8, 8)}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs font-medium uppercase tracking-wide text-slate-400">
              <tr>
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Programme</th>
                <th className="pb-3 pr-4 font-medium">Amount</th>
                <th className="pb-3 pr-4 font-medium">In TON</th>
                <th className="pb-3 pr-4 font-medium">Tx Hash</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No payments yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const selected = p.id === activeReceiptId;
                  return (
                    <tr
                      key={p.id}
                      className={`cursor-pointer transition-colors ${selected ? "bg-cyan-950/40" : "hover:bg-white/5"}`}
                      onClick={() => setSelectedPaymentId(p.id)}
                    >
                      <td className="py-3 pr-4 text-slate-200">{formatDate(p.createdAt)}</td>
                      <td className="py-3 pr-4 text-slate-300">{paymentProgrammeLabel(p)}</td>
                      <td className="py-3 pr-4 text-white">UGX {p.totalUgx.toLocaleString()}</td>
                      <td className="py-3 pr-4 font-mono text-slate-200">{p.tonAmount.toFixed(2)}</td>
                      <td className="max-w-[100px] py-3 pr-4 font-mono text-xs text-slate-500" title={p.txHash}>
                        {abbrevTx(p.txHash)}
                      </td>
                      <td className="py-3">
                        {p.status === "confirmed" ? (
                          <StatusConfirmed />
                        ) : (
                          <span className="text-sm capitalize text-slate-400">{p.status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {activePayment?.status === "confirmed" ? (
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setPreviewId(activeReceiptId)}
              className="flex-1 rounded-lg border border-cyan-500/35 bg-cyan-950/40 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400/55"
            >
              View Receipt
            </button>
            <a
              href={`/api/receipts/${activeReceiptId}/pdf`}
              className="inline-flex h-[46px] w-12 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-black/30 text-slate-200 hover:bg-white/5"
              title="Download receipt PDF"
              aria-label="Download receipt PDF"
            >
              <DownloadIcon className="h-5 w-5" />
            </a>
          </div>
        ) : activePayment ? (
          <p className="mt-6 text-center text-sm text-slate-400">
            Receipt is available once this payment is confirmed.
          </p>
        ) : null}
      </article>

      <ReceiptPreviewModal paymentId={previewId} open={previewId !== null} onClose={() => setPreviewId(null)} />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

type Ledger = {
  feeRequiredUgx: number;
  previousBalanceUgx: number;
  previousBalancePaidUgx: number;
  currentTermPaidUgx: number;
  totalOutstandingUgx: number;
  statusLabel: string;
  termLabel: string;
};

type PaymentRow = {
  id: string;
  totalUgx: number;
  confirmedAt: string | null;
  receiptNo: string | null;
  receiptUrl: string;
  pdfUrl: string;
};

function ugx(n: number) {
  return `UGX ${n.toLocaleString("en-UG")}`;
}

export default function ParentPortalPage() {
  const [schoolPayCode, setSchoolPayCode] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [school, setSchool] = useState<{ name: string; slug: string } | null>(null);
  const [student, setStudent] = useState<{ name: string; admissionNo: string } | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [payUrl, setPayUrl] = useState("");

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/public/parent/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolPayCode, admissionNo }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Lookup failed");
      setSchool(j.school);
      setStudent(j.student);
      setLedger(j.ledger);
      setPayments(j.payments ?? []);
      setPayUrl(j.payUrl ?? "");
    } catch (err) {
      setSchool(null);
      setStudent(null);
      setLedger(null);
      setPayments([]);
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-lg px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Parent portal</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">View fees & receipts</h1>
      <p className="mt-2 text-sm text-slate-400">
        Enter the school&apos;s 6-digit School Pay Code and your child&apos;s admission number.
      </p>

      <form onSubmit={onLookup} className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-[#0a101f] p-5">
        <label className="block text-xs text-slate-400">
          School Pay Code
          <input
            required
            value={schoolPayCode}
            onChange={(e) => setSchoolPayCode(e.target.value)}
            placeholder="245849"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Admission number
          <input
            required
            value={admissionNo}
            onChange={(e) => setAdmissionNo(e.target.value)}
            placeholder="UQS-2026-001"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {busy ? "Looking up…" : "View balance"}
        </button>
      </form>

      {school && student && ledger ? (
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 p-5">
            <p className="text-xs text-cyan-200/80">{school.name}</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{student.name}</h2>
            <p className="text-xs text-slate-400">{student.admissionNo} · {ledger.termLabel}</p>
            <p className="mt-4 text-3xl font-semibold text-white">{ugx(ledger.totalOutstandingUgx)}</p>
            <p className="text-sm text-slate-400">Outstanding · {ledger.statusLabel}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div>Fee required: {ugx(ledger.feeRequiredUgx)}</div>
              <div>Prev. balance: {ugx(ledger.previousBalanceUgx)}</div>
              <div>Prev. paid: {ugx(ledger.previousBalancePaidUgx)}</div>
              <div>Term paid: {ugx(ledger.currentTermPaidUgx)}</div>
            </dl>
            {payUrl ? (
              <Link
                href={payUrl}
                className="mt-5 inline-flex rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Pay online
              </Link>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
            <h3 className="text-sm font-semibold text-white">Payment history</h3>
            <ul className="mt-3 space-y-2">
              {payments.length === 0 ? (
                <li className="text-sm text-slate-500">No confirmed payments yet.</li>
              ) : (
                payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 py-2 text-sm">
                    <div>
                      <p className="text-white">{ugx(p.totalUgx)}</p>
                      <p className="text-xs text-slate-500">
                        {p.confirmedAt ? new Date(p.confirmedAt).toLocaleDateString() : "—"}
                        {p.receiptNo ? ` · ${p.receiptNo}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={p.receiptUrl} className="text-xs text-cyan-300 hover:underline">
                        Receipt
                      </Link>
                      <a href={p.pdfUrl} className="text-xs text-violet-300 hover:underline" target="_blank" rel="noreferrer">
                        PDF
                      </a>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}

      <p className="mt-10 text-center text-xs text-slate-500">
        <Link href="/" className="text-cyan-400 hover:underline">
          ODEL HUB home
        </Link>
      </p>
    </main>
  );
}

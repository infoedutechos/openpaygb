"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

type Charge = {
  id: string;
  accountName: string;
  amountUgx: number;
  term: number;
};

type Props = {
  studentId: string;
  studentName: string;
  open: boolean;
  onClose: () => void;
  onPaid?: () => void;
};

export function SchoolPayBillModal({ studentId, studentName, open, onClose, onPaid }: Props) {
  const { schoolFetch, organizationSlug } = useSchoolAdminApi();
  const [term, setTerm] = useState(1);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(false);
  const [amountUgx, setAmountUgx] = useState(0);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "MOBILE TRANSFER">("CASH");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptNo, setReceiptNo] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!open || !studentId) return;
    setLoading(true);
    try {
      const [billR, sessR] = await Promise.all([
        schoolFetch("/api/admin/school/bills", undefined, { studentId, term }),
        schoolFetch("/api/admin/school/sessions"),
      ]);
      if (billR.ok) {
        const j = (await billR.json()) as { charges?: Charge[] };
        const list = j.charges ?? [];
        setCharges(list);
        const total = list.reduce((s, c) => s + c.amountUgx, 0);
        if (total > 0) setAmountUgx(total);
      }
      if (sessR.ok) {
        const j = (await sessR.json()) as { context?: { activeTerm?: number } };
        if (j.context?.activeTerm) setTerm(j.context.activeTerm);
      }
    } finally {
      setLoading(false);
    }
  }, [open, studentId, term, schoolFetch]);

  useEffect(() => {
    if (open) {
      setReceiptNo(null);
      setError(null);
      void load();
    }
  }, [open, load]);

  async function submitPayment() {
    if (amountUgx <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await schoolFetch("/api/admin/school/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, term, amountUgx, paymentMode, notes, organizationSlug }),
      });
      const j = (await r.json()) as { receiptNo?: string; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Payment failed");
      setReceiptNo(j.receiptNo ?? null);
      onPaid?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const totalExpected = charges.reduce((s, c) => s + c.amountUgx, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0a101f] p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{studentName} — Pay bill</h2>
            <p className="text-sm text-slate-400">Record cash or mobile transfer receipt for Term {term}.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        {receiptNo ? (
          <div className="mt-4 space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <p className="text-emerald-300 font-semibold">Payment recorded — {receiptNo}</p>
            <p className="text-sm text-slate-300">{formatUgx(amountUgx)} via {paymentMode}</p>
            <div className="flex gap-2">
              <a href="/admin/receipts" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">
                View receipts
              </a>
              <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300">
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
              Term
              <select
                value={term}
                onChange={(e) => setTerm(Number(e.target.value))}
                className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
              >
                <option value={1}>Term 1</option>
                <option value={2}>Term 2</option>
                <option value={3}>Term 3</option>
              </select>
            </label>
            {loading ? (
              <p className="mt-4 text-sm text-slate-500">Loading charges…</p>
            ) : (
              <>
                {charges.length > 0 ? (
                  <ul className="mt-4 divide-y divide-white/10 text-sm">
                    {charges.map((c) => (
                      <li key={c.id} className="flex justify-between py-2 text-slate-200">
                        <span>{c.accountName}</span>
                        <span>{formatUgx(c.amountUgx)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between py-2 font-semibold text-white">
                      <span>Expected</span>
                      <span>{formatUgx(totalExpected)}</span>
                    </li>
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No bill charges — enter amount manually.</p>
                )}
                <div className="mt-4 grid gap-3">
                  <input
                    type="number"
                    min={1}
                    value={amountUgx || ""}
                    onChange={(e) => setAmountUgx(Number(e.target.value))}
                    placeholder="Amount UGX"
                    className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
                  />
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as "CASH" | "MOBILE TRANSFER")}
                    className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
                  >
                    <option value="CASH">CASH</option>
                    <option value="MOBILE TRANSFER">MOBILE TRANSFER</option>
                  </select>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
                  />
                </div>
                {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submitPayment()}
                  className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Recording…" : "Record payment & issue receipt"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

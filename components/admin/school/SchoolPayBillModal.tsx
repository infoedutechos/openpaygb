"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { SchoolModalHeader } from "@/components/admin/school/SchoolModalHeader";
import { SchoolTermSelect } from "@/components/admin/school/SchoolTermSelect";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { schoolTermLabel } from "@/lib/school-term";

type Charge = {
  id: string;
  accountName: string;
  amountUgx: number;
  term: number;
};

type LedgerSnapshot = {
  previousBalanceUgx: number;
  currentBalanceUgx: number;
  totalOutstandingUgx: number;
  feeRequiredUgx: number;
  statusLabel?: string;
};

type Props = {
  studentId: string;
  studentName: string;
  open: boolean;
  onClose: () => void;
  onPaid?: () => void;
};

export function SchoolPayBillModal({ studentId, studentName, open, onClose, onPaid }: Props) {
  const { schoolFetch, organizationSlug, hrefWithOrgSlug } = useSchoolAdminApi();
  const [term, setTerm] = useState(1);
  const [termLabel, setTermLabel] = useState("Term 1");
  const [termReady, setTermReady] = useState(false);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [ledger, setLedger] = useState<LedgerSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [amountUgx, setAmountUgx] = useState(0);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "MOBILE TRANSFER">("CASH");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptNo, setReceiptNo] = useState<string | null>(null);

  const feeLedgerHref = hrefWithOrgSlug(
    `/admin/fee-ledger?studentId=${encodeURIComponent(studentId)}&term=${term}&returnPay=1&studentName=${encodeURIComponent(studentName)}`,
  );

  useEffect(() => {
    if (!open) return;
    setReceiptNo(null);
    setError(null);
    setTermReady(false);
    setAmountUgx(0);
    void (async () => {
      const [sessR, termsR] = await Promise.all([
        schoolFetch("/api/admin/school/sessions"),
        schoolFetch("/api/admin/school/terms"),
      ]);
      let nextTerm = 1;
      let nextLabel = "Term 1";
      if (sessR.ok) {
        const j = (await sessR.json()) as {
          context?: { activeTerm?: number; activeTermLabel?: string };
        };
        if (j.context?.activeTerm) nextTerm = j.context.activeTerm;
        if (j.context?.activeTermLabel) nextLabel = j.context.activeTermLabel;
      }
      if (termsR.ok) {
        const j = (await termsR.json()) as {
          terms?: { termNumber: number; label: string; isActive: boolean }[];
          context?: { activeTerm?: number; activeTermLabel?: string };
        };
        if (j.context?.activeTerm) nextTerm = j.context.activeTerm;
        if (j.context?.activeTermLabel) nextLabel = j.context.activeTermLabel;
        const match = j.terms?.find((t) => t.termNumber === nextTerm);
        if (match?.label) nextLabel = match.label;
      }
      setTerm(nextTerm);
      setTermLabel(nextLabel || schoolTermLabel(nextTerm));
      setTermReady(true);
    })();
  }, [open, schoolFetch]);

  const loadCharges = useCallback(async () => {
    if (!open || !studentId || !termReady) return;
    setLoading(true);
    try {
      const [billR, ledgerR] = await Promise.all([
        schoolFetch("/api/admin/school/bills", undefined, { studentId, term }),
        schoolFetch("/api/admin/school/fee-ledger", undefined, { studentId, term }),
      ]);
      if (billR.ok) {
        const j = (await billR.json()) as { charges?: Charge[] };
        const list = j.charges ?? [];
        setCharges(list);
        const total = list.reduce((s, c) => s + c.amountUgx, 0);
        if (total > 0) setAmountUgx(total);
      }
      if (ledgerR.ok) {
        const j = (await ledgerR.json()) as { row?: LedgerSnapshot };
        setLedger(j.row ?? null);
        if (j.row && j.row.totalOutstandingUgx > 0) {
          setAmountUgx(j.row.totalOutstandingUgx);
        }
      } else {
        setLedger(null);
      }
    } finally {
      setLoading(false);
    }
  }, [open, studentId, term, termReady, schoolFetch]);

  useEffect(() => {
    void loadCharges();
  }, [loadCharges]);

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
        <SchoolModalHeader
          onBack={onClose}
          title={`${studentName} — Pay bill`}
          subtitle={`Record cash or mobile transfer receipt for ${termLabel}.`}
        />

        {receiptNo ? (
          <div className="mt-4 space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <p className="font-semibold text-emerald-300">Payment recorded — {receiptNo}</p>
            <p className="text-sm text-slate-300">
              {formatUgx(amountUgx)} via {paymentMode}
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/admin/receipts" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">
                View receipts
              </a>
              <Link
                href={feeLedgerHref}
                className="rounded-lg border border-cyan-500/40 px-4 py-2 text-sm font-semibold text-cyan-200"
              >
                Student fee ledger
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <SchoolTermSelect
              className="mt-4"
              value={term}
              onChange={(n, label) => {
                setTerm(n);
                setTermLabel(label);
              }}
            />

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Previous balance</p>
                <p className="font-semibold text-amber-200">
                  {ledger ? formatUgx(ledger.previousBalanceUgx) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Current balance</p>
                <p className="font-semibold text-white">
                  {ledger ? formatUgx(ledger.currentBalanceUgx) : "—"}
                </p>
              </div>
              {ledger ? (
                <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
                  <span className="text-xs text-slate-400">
                    Outstanding {formatUgx(ledger.totalOutstandingUgx)}
                    {ledger.statusLabel ? ` · ${ledger.statusLabel}` : ""}
                  </span>
                  <Link
                    href={feeLedgerHref}
                    className="rounded-lg bg-violet-800/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                  >
                    Student fee ledger
                  </Link>
                </div>
              ) : (
                <div className="col-span-2">
                  <Link
                    href={feeLedgerHref}
                    className="inline-flex rounded-lg bg-violet-800/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                  >
                    Student fee ledger
                  </Link>
                </div>
              )}
            </div>

            {loading || !termReady ? (
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

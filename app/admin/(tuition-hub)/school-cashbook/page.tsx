"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { clientFetchErrorMessage } from "@/lib/client-fetch-error";

type Deposit = {
  id: string;
  amountUgx: number;
  method: string;
  reference: string;
  note: string;
  depositedAt: string;
};

/** Daily collections cashbook + bank/cash deposit trail. */
function CashbookInner() {
  const { schoolFetch, needsOrgSlug } = useSchoolAdminApi();
  const [data, setData] = useState<{
    expectedUgx: number;
    receivedUgx: number;
    outstandingUgx: number;
    incomeUgx: number;
    expenditureUgx: number;
  } | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [depositTotal, setDepositTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ amountUgx: "", method: "bank", reference: "", note: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (needsOrgSlug) return;
    setError(null);
    try {
      const [dashRes, depRes] = await Promise.all([
        schoolFetch("/api/admin/school/dashboard"),
        schoolFetch("/api/admin/school/cashbook-deposits"),
      ]);
      if (dashRes.ok) {
        const j = await dashRes.json();
        const d = j.dashboard;
        if (d) {
          setData({
            expectedUgx: d.accounts?.expectedUgx ?? 0,
            receivedUgx: d.accounts?.receivedUgx ?? 0,
            outstandingUgx: d.accounts?.outstandingUgx ?? 0,
            incomeUgx: d.cashflows?.incomeUgx ?? 0,
            expenditureUgx: d.cashflows?.expenditureUgx ?? 0,
          });
        }
      }
      if (depRes.ok) {
        const j = (await depRes.json()) as { deposits: Deposit[]; totalDepositedUgx: number };
        setDeposits(j.deposits ?? []);
        setDepositTotal(j.totalDepositedUgx ?? 0);
      }
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    }
  }, [needsOrgSlug, schoolFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addDeposit() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const amountUgx = Math.round(Number(form.amountUgx));
      if (!Number.isFinite(amountUgx) || amountUgx < 1) throw new Error("Enter a deposit amount");
      const res = await schoolFetch("/api/admin/school/cashbook-deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUgx,
          method: form.method,
          reference: form.reference || undefined,
          note: form.note || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Save failed");
      setForm({ amountUgx: "", method: "bank", reference: "", note: "" });
      setMessage("Deposit recorded.");
      void load();
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Cashbook</h1>
        <p className="text-sm text-slate-400">
          Term collections vs outflows, plus a bank/cash deposit trail for day-close.
        </p>
      </div>
      {needsOrgSlug ? <p className="text-sm text-amber-300">Select school org slug.</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
            <p className="text-xs text-slate-400">Fees expected</p>
            <p className="mt-1 text-xl font-semibold text-white">{formatUgx(data.expectedUgx)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5">
            <p className="text-xs text-emerald-200/80">Collected</p>
            <p className="mt-1 text-xl font-semibold text-emerald-200">{formatUgx(data.receivedUgx)}</p>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-5">
            <p className="text-xs text-rose-200/80">Outstanding</p>
            <p className="mt-1 text-xl font-semibold text-rose-200">{formatUgx(data.outstandingUgx)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
            <p className="text-xs text-slate-400">Cashflow income</p>
            <p className="mt-1 text-xl font-semibold text-white">{formatUgx(data.incomeUgx)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
            <p className="text-xs text-slate-400">Expenditure / outflow</p>
            <p className="mt-1 text-xl font-semibold text-white">{formatUgx(data.expenditureUgx)}</p>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5">
            <p className="text-xs text-cyan-200/80">Bank/cash deposits (term)</p>
            <p className="mt-1 text-xl font-semibold text-cyan-100">{formatUgx(depositTotal)}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Loading cashbook…</p>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
        <h2 className="text-lg font-semibold text-white">Record deposit</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-slate-400">
            Amount UGX
            <input
              value={form.amountUgx}
              onChange={(e) => setForm((f) => ({ ...f, amountUgx: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-400">
            Method
            <select
              value={form.method}
              onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
              <option value="momo">MoMo</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Reference
            <input
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-400">
            Note
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void addDeposit()}
          className="mt-3 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save deposit
        </button>
        <ul className="mt-4 space-y-2">
          {deposits.length === 0 ? (
            <li className="text-sm text-slate-500">No deposits recorded yet.</li>
          ) : (
            deposits.map((d) => (
              <li key={d.id} className="flex flex-wrap gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200">
                <span className="font-medium">{formatUgx(d.amountUgx)}</span>
                <span className="text-slate-500">{d.method}</span>
                <span className="text-slate-500">{d.reference || "—"}</span>
                <span className="text-slate-500">{new Date(d.depositedAt).toLocaleString()}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

export default function SchoolCashbookPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <CashbookInner />
    </Suspense>
  );
}

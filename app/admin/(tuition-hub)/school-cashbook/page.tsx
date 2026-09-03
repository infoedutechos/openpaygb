"use client";

import { Suspense, useEffect, useState } from "react";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

/** Daily collections cashbook — wraps school dashboard recovery + receipt totals. */
function CashbookInner() {
  const { schoolFetch, needsOrgSlug } = useSchoolAdminApi();
  const [data, setData] = useState<{
    expectedUgx: number;
    receivedUgx: number;
    outstandingUgx: number;
    incomeUgx: number;
    expenditureUgx: number;
  } | null>(null);

  useEffect(() => {
    if (needsOrgSlug) return;
    void schoolFetch("/api/admin/school/dashboard").then(async (r) => {
      const j = await r.json();
      const d = j.dashboard;
      if (!d) return;
      setData({
        expectedUgx: d.accounts?.expectedUgx ?? 0,
        receivedUgx: d.accounts?.receivedUgx ?? 0,
        outstandingUgx: d.accounts?.outstandingUgx ?? 0,
        incomeUgx: d.cashflows?.incomeUgx ?? 0,
        expenditureUgx: d.cashflows?.expenditureUgx ?? 0,
      });
    });
  }, [needsOrgSlug, schoolFetch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Cashbook</h1>
        <p className="text-sm text-slate-400">
          Term collections vs outflows. Record vouchers under Outflow; bank deposits tracked as expenditure notes for now.
        </p>
      </div>
      {needsOrgSlug ? <p className="text-sm text-amber-300">Select school org slug.</p> : null}
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
            <p className="text-xs text-cyan-200/80">Net (income − spend)</p>
            <p className="mt-1 text-xl font-semibold text-cyan-100">
              {formatUgx(data.incomeUgx - data.expenditureUgx)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Loading cashbook…</p>
      )}
    </div>
  );
}

export default function SchoolCashbookPage() {
  return (
    <Suspense fallback={<p className="text-slate-400">Loading…</p>}>
      <CashbookInner />
    </Suspense>
  );
}

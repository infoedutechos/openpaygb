"use client";

import { useCallback, useEffect, useState } from "react";
import { schoolTermOptions } from "@/lib/school-term";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

type Account = { id: string; name: string; kind: string };
type Row = { id: string; expenditureAccountId: string; accountName: string; percentOfIncome: number; minBalanceUgx: number };

export function SchoolAppropriationSettings() {
  const { schoolFetch, organizationSlug } = useSchoolAdminApi();
  const [term, setTerm] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [appropriatedPercent, setAppropriatedPercent] = useState(0);
  const [unappropriatedPercent, setUnappropriatedPercent] = useState(100);
  const [expenditureAccounts, setExpenditureAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [percent, setPercent] = useState(10);
  const [minBalance, setMinBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [accR, appR] = await Promise.all([
      schoolFetch("/api/admin/school/accounts", undefined, { kind: "expenditure" }),
      schoolFetch("/api/admin/school/appropriation", undefined, { term }),
    ]);
    if (accR.ok) {
      const j = (await accR.json()) as { accounts?: Account[] };
      setExpenditureAccounts(j.accounts ?? []);
    }
    if (appR.ok) {
      const j = (await appR.json()) as {
        rows?: Row[];
        appropriatedPercent?: number;
        unappropriatedPercent?: number;
      };
      setRows(j.rows ?? []);
      setAppropriatedPercent(j.appropriatedPercent ?? 0);
      setUnappropriatedPercent(j.unappropriatedPercent ?? 100);
    }
  }, [schoolFetch, term]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!accountId) return;
    setBusy(true);
    setError(null);
    try {
      const r = await schoolFetch("/api/admin/school/appropriation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationSlug,
          term,
          expenditureAccountId: accountId,
          percentOfIncome: percent,
          minBalanceUgx: minBalance,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      setAccountId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this appropriation rule?")) return;
    setBusy(true);
    try {
      await schoolFetch("/api/admin/school/appropriation", { method: "DELETE" }, { id });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#0a101f] p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Funds appropriation</h2>
        <p className="mt-1 text-sm text-slate-400">
          Allocate income percentages to expenditure accounts per term (reference app Settings → Funds Appropriation).
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        Term
        <select
          value={term}
          onChange={(e) => setTerm(Number(e.target.value))}
          className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
        >
          {schoolTermOptions().map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-emerald-400">Appropriated: {appropriatedPercent.toFixed(1)}%</span>
        <span className="text-amber-400">Unappropriated: {unappropriatedPercent.toFixed(1)}%</span>
      </div>
      {rows.length > 0 ? (
        <table className="w-full text-left text-sm text-slate-200">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Expenditure account</th>
              <th className="py-2">%</th>
              <th className="py-2">Min balance</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="py-2">{r.accountName}</td>
                <td className="py-2">{r.percentOfIncome}%</td>
                <td className="py-2">{formatUgx(r.minBalanceUgx)}</td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(r.id)}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-slate-500">No appropriation rows for this term yet.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
        >
          <option value="">Expenditure account</option>
          {expenditureAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          placeholder="% of income"
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
        />
        <input
          type="number"
          min={0}
          value={minBalance}
          onChange={(e) => setMinBalance(Number(e.target.value))}
          placeholder="Min balance UGX"
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          disabled={busy || !accountId}
          onClick={() => void save()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add / update
        </button>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </section>
  );
}

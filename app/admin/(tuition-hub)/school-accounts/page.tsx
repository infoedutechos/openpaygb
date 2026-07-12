"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";

type Account = { id: string; name: string; kind: "income" | "expenditure" };
type LedgerLine = { date: string; trackId: string; name: string; particulars: string; amountUgx: number; direction: string };

export default function SchoolAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"income" | "expenditure">("income");
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [ledgerId, setLedgerId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<{ accountName: string; kind: string; inflow: LedgerLine[]; outflow: LedgerLine[] } | null>(null);
  const [term, setTerm] = useState(1);

  const load = useCallback(async () => {
    const [accR, sessR] = await Promise.all([
      fetch("/api/admin/school/accounts", { credentials: "include" }),
      fetch("/api/admin/school/sessions", { credentials: "include" }),
    ]);
    if (accR.ok) {
      const j = (await accR.json()) as { accounts?: Account[] };
      setAccounts(j.accounts ?? []);
    }
    if (sessR.ok) {
      const j = (await sessR.json()) as { context?: { activeTerm?: number } };
      if (j.context?.activeTerm) setTerm(j.context.activeTerm);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!ledgerId) return;
    void fetch(`/api/admin/school/accounts/${ledgerId}/transactions?term=${term}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setLedger(j));
  }, [ledgerId, term]);

  const filtered = accounts.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));

  const groupedAccounts = useMemo(
    () =>
      (["income", "expenditure"] as const)
        .map((kind) => ({ kind, rows: filtered.filter((a) => a.kind === kind) }))
        .filter((g) => g.rows.length > 0),
    [filtered],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Accounts</h1>
        <p className="text-sm text-slate-400">Income fee heads and expenditure accounts — salary inflow / outflow ledgers.</p>
      </div>

      <form
        className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#0a101f] p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void (async () => {
            await fetch("/api/admin/school/accounts", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, kind }),
            });
            setName("");
            await load();
          })();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" className="min-w-[200px] flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />
        <select value={kind} onChange={(e) => setKind(e.target.value as "income" | "expenditure")} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white">
          <option value="income">INCOME</option>
          <option value="expenditure">EXPENDITURE</option>
        </select>
        <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Add account</button>
      </form>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search accounts…" className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />

      <div className="space-y-4 md:hidden">
        {(["income", "expenditure"] as const).map((kind) => {
          const rows = filtered.filter((a) => a.kind === kind);
          if (rows.length === 0) return null;
          return (
            <div key={kind}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-200">{kind} accounts — {rows.length}</p>
              {rows.map((a) => (
                <article key={a.id} className="mb-2 rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm text-slate-200">
                  <p className="font-medium text-white">{a.name}</p>
                  <p className="mt-1 text-xs uppercase text-slate-400">{a.kind}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button type="button" className="text-xs text-cyan-300" onClick={() => setLedgerId(a.id)}>Ledger</button>
                    <button type="button" className="text-xs text-amber-300" onClick={() => { setEditId(a.id); setEditName(a.name); }}>Edit</button>
                    <button type="button" className="text-xs text-rose-300" onClick={() => void fetch(`/api/admin/school/accounts/${a.id}`, { method: "DELETE", credentials: "include" }).then(() => load())}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-slate-400">
            <tr>
              <th className="px-4 py-2">Account name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {groupedAccounts.map((group) => (
              <Fragment key={group.kind}>
                <tr className="bg-violet-950/30 text-violet-100">
                  <td colSpan={3} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                    {group.kind} accounts — {group.rows.length}
                  </td>
                </tr>
                {group.rows.map((a) => (
                  <tr key={a.id} className="border-t border-white/10 text-slate-200">
                    <td className="px-4 py-2">
                      {editId === a.id ? (
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded border border-white/15 bg-black/30 px-2 py-1 text-white" />
                      ) : (
                        a.name
                      )}
                    </td>
                    <td className="px-4 py-2 uppercase">{a.kind}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button type="button" className="text-xs text-cyan-300" onClick={() => setLedgerId(a.id)}>Ledger</button>
                      {editId === a.id ? (
                        <button type="button" className="text-xs text-emerald-300" onClick={() => void fetch(`/api/admin/school/accounts/${a.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName }) }).then(() => { setEditId(null); void load(); })}>Save</button>
                      ) : (
                        <button type="button" className="text-xs text-amber-300" onClick={() => { setEditId(a.id); setEditName(a.name); }}>Edit</button>
                      )}
                      <button type="button" className="text-xs text-rose-300" onClick={() => void fetch(`/api/admin/school/accounts/${a.id}`, { method: "DELETE", credentials: "include" }).then(() => load())}>Delete</button>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {ledgerId && ledger ? (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-white">{ledger.accountName} ledger ({ledger.kind})</h2>
            <select value={term} onChange={(e) => setTerm(Number(e.target.value))} className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white text-sm">
              <option value={1}>Term 1</option>
              <option value={2}>Term 2</option>
              <option value={3}>Term 3</option>
            </select>
          </div>
          {[...ledger.inflow, ...ledger.outflow].length === 0 ? (
            <p className="text-sm text-slate-500">No transactions for this term.</p>
          ) : (
            <table className="min-w-full text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1 text-left">Date</th>
                  <th className="py-1 text-left">Track</th>
                  <th className="py-1 text-left">Name</th>
                  <th className="py-1 text-left">Particulars</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...ledger.inflow, ...ledger.outflow].map((l, i) => (
                  <tr key={i} className="border-t border-white/10 text-slate-200">
                    <td className="py-1">{l.date}</td>
                    <td className="py-1 font-mono">{l.trackId}</td>
                    <td className="py-1">{l.name}</td>
                    <td className="py-1">{l.particulars}</td>
                    <td className="py-1 text-right">{formatUgx(l.amountUgx)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button type="button" onClick={() => { setLedgerId(null); setLedger(null); }} className="text-xs text-slate-400">Close ledger</button>
        </div>
      ) : null}
    </div>
  );
}

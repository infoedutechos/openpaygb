"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

type Account = { id: string; name: string; sortOrder: number; defaultAmountUgx?: number };

function FeeStructureInner() {
  const { schoolFetch, needsOrgSlug, hrefWithOrgSlug, organizationSlug } = useSchoolAdminApi();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recommended, setRecommended] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const load = useCallback(async () => {
    if (needsOrgSlug) return;
    const r = await schoolFetch("/api/admin/school/fee-adjustments");
    const j = (await r.json()) as { accounts?: Account[]; recommended?: string[]; error?: string };
    if (!r.ok) {
      setError(j.error ?? "Failed to load fee heads");
      return;
    }
    setAccounts(j.accounts ?? []);
    setRecommended(j.recommended ?? []);
    setError(null);
  }, [needsOrgSlug, schoolFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addHead(name: string, amountUgx = 0) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const r = await schoolFetch("/api/admin/school/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim().toUpperCase(),
          kind: "income",
          defaultAmountUgx: amountUgx,
          organizationSlug,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not create fee head");
      setMessage(`Added ${name.trim().toUpperCase()}${amountUgx > 0 ? ` (${formatUgx(amountUgx)})` : ""}`);
      setNewName("");
      setNewAmount("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveAmount(id: string, amountUgx: number) {
    setBusy(true);
    setError(null);
    try {
      const r = await schoolFetch(`/api/admin/school/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultAmountUgx: amountUgx, organizationSlug }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not update amount");
      setEditingId(null);
      setMessage("Amount saved — Assign bill will use this as the default.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Fee structure</h1>
        <p className="text-sm text-slate-400">
          Define income fee heads and their default amounts. Then bill students under{" "}
          <Link href={hrefWithOrgSlug("/admin/students")} className="text-cyan-300 hover:underline">
            Students / bills
          </Link>{" "}
          — amount autofills from here (you can still change it per bill).
        </p>
      </div>
      {needsOrgSlug ? <p className="text-sm text-amber-300">Select a school organization first.</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <section className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
        <h2 className="text-sm font-semibold text-white">Recommended heads</h2>
        <p className="mt-1 text-xs text-slate-500">Adds the head; set the amount in the table below.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {recommended.map((name) => {
            const exists = accounts.some((a) => a.name === name);
            return (
              <button
                key={name}
                type="button"
                disabled={busy || exists}
                onClick={() => void addHead(name)}
                className={`rounded-lg border px-3 py-1.5 text-xs ${
                  exists
                    ? "border-emerald-500/30 text-emerald-300/70"
                    : "border-violet-400/40 text-violet-100 hover:bg-violet-500/15"
                } disabled:opacity-50`}
              >
                {exists ? `✓ ${name}` : `+ ${name}`}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
        <h2 className="text-sm font-semibold text-white">Custom fee head</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. EXAM FEE"
            className="min-w-[160px] flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
          <input
            type="number"
            min={0}
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="Amount UGX"
            className="w-40 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            disabled={busy || !newName.trim()}
            onClick={() =>
              void addHead(newName, Math.max(0, parseInt(newAmount.replace(/[^\d]/g, ""), 10) || 0))
            }
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#0a101f] text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2">Fee head</th>
              <th className="px-3 py-2">Default amount</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-white/5 text-slate-200">
                <td className="px-3 py-2 font-medium">{a.name}</td>
                <td className="px-3 py-2">
                  {editingId === a.id ? (
                    <input
                      type="number"
                      min={0}
                      autoFocus
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-36 rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
                    />
                  ) : (
                    <span className={a.defaultAmountUgx ? "text-white" : "text-slate-500"}>
                      {a.defaultAmountUgx ? formatUgx(a.defaultAmountUgx) : "— set amount"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500">{a.sortOrder}</td>
                <td className="px-3 py-2 text-right">
                  {editingId === a.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void saveAmount(
                            a.id,
                            Math.max(0, parseInt(editAmount.replace(/[^\d]/g, ""), 10) || 0),
                          )
                        }
                        className="text-xs font-semibold text-emerald-300 hover:underline"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs text-slate-400 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(a.id);
                        setEditAmount(a.defaultAmountUgx ? String(a.defaultAmountUgx) : "");
                      }}
                      className="text-xs font-semibold text-cyan-300 hover:underline"
                    >
                      Edit amount
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Tip: You do <strong className="text-slate-400">not</strong> need an “Add fee item” on Assign bill — pick the
        fee head (amount fills from here), then Assign. For another head, Assign bill again. Discounts: Fee ledger →
        Adjust. All accounts:{" "}
        <Link href={hrefWithOrgSlug("/admin/school-accounts")} className="text-cyan-300 hover:underline">
          Accounts
        </Link>
        .
      </p>
    </div>
  );
}

export default function FeeStructurePage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
      <FeeStructureInner />
    </Suspense>
  );
}

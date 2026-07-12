"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

type Account = { id: string; name: string };
type ClassOption = { id: string; code: string; name: string };

export function SchoolBulkBillsPanel({ onAssigned }: { onAssigned?: () => void }) {
  const { schoolFetch, organizationSlug } = useSchoolAdminApi();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [term, setTerm] = useState(1);
  const [accountId, setAccountId] = useState("");
  const [classId, setClassId] = useState("");
  const [amountUgx, setAmountUgx] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    const [accR, clsR] = await Promise.all([
      schoolFetch("/api/admin/school/accounts", undefined, { kind: "income" }),
      schoolFetch("/api/admin/school/classes"),
    ]);
    if (accR.ok) {
      const j = (await accR.json()) as { accounts?: Account[] };
      setAccounts(j.accounts ?? []);
    }
    if (clsR.ok) {
      const j = (await clsR.json()) as { classes?: ClassOption[] };
      setClasses(j.classes ?? []);
    }
  }, [schoolFetch]);

  useEffect(() => {
    if (open) {
      void loadMeta();
      void schoolFetch("/api/admin/school/sessions")
        .then((r) => r.json())
        .then((j) => {
          if (j.context?.activeTerm) setTerm(j.context.activeTerm);
        });
    }
  }, [open, loadMeta, schoolFetch]);

  async function assign() {
    if (!accountId || !classId || amountUgx <= 0) {
      setError("Select class, income account, and amount.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const r = await schoolFetch("/api/admin/school/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationSlug,
          term,
          schoolAccountId: accountId,
          amountUgx,
          classId,
          notes,
        }),
      });
      const j = (await r.json()) as { created?: number; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Bulk bill failed");
      setMessage(`Assigned bill to ${j.created ?? 0} student(s).`);
      onAssigned?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk bill failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a101f] p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-semibold text-violet-300 hover:text-violet-200"
      >
        {open ? "Hide bulk bills" : "+ Bulk assign bills (class)"}
      </button>
      {open ? (
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
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
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="">Income account (fee head)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={amountUgx || ""}
              onChange={(e) => setAmountUgx(Number(e.target.value))}
              placeholder="Amount UGX"
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="sm:col-span-2 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void assign()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Assigning…" : "Assign to all students in class"}
          </button>
          {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <p className="text-xs text-slate-500">
            Each student receives a {formatUgx(amountUgx || 0).replace("0", "…")} charge on the selected fee head for Term {term}.
          </p>
        </div>
      ) : null}
    </div>
  );
}

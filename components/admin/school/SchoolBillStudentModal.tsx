"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { SchoolBillingRoundSelect } from "@/components/admin/school/SchoolBillingRoundSelect";
import { SchoolModalHeader } from "@/components/admin/school/SchoolModalHeader";
import { SchoolTermSelect } from "@/components/admin/school/SchoolTermSelect";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import type { SchoolBillingRound } from "@/lib/school-billing-rounds";

type Account = { id: string; name: string; defaultAmountUgx?: number };

type Props = {
  studentId: string;
  studentName: string;
  open: boolean;
  onClose: () => void;
  onAssigned?: () => void;
};

export function SchoolBillStudentModal({ studentId, studentName, open, onClose, onAssigned }: Props) {
  const { schoolFetch, organizationSlug } = useSchoolAdminApi();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [term, setTerm] = useState(1);
  const [billingRound, setBillingRound] = useState<SchoolBillingRound>("once");
  const [accountId, setAccountId] = useState("");
  const [amountUgx, setAmountUgx] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    const [accR, sessR] = await Promise.all([
      schoolFetch("/api/admin/school/accounts", undefined, { kind: "income" }),
      schoolFetch("/api/admin/school/sessions"),
    ]);
    if (accR.ok) {
      const j = (await accR.json()) as { accounts?: Account[] };
      setAccounts(j.accounts ?? []);
    }
    if (sessR.ok) {
      const j = (await sessR.json()) as { context?: { activeTerm?: number } };
      if (j.context?.activeTerm) setTerm(j.context.activeTerm);
    }
  }, [schoolFetch]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setMessage(null);
    setAmountUgx(0);
    setAccountId("");
    setNotes("");
    setBillingRound("once");
    void loadMeta();
  }, [open, loadMeta]);

  async function assign() {
    if (!accountId || amountUgx <= 0) {
      setError("Select an income account and enter an amount.");
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
          studentIds: [studentId],
          notes,
          billingRound,
        }),
      });
      const j = (await r.json()) as {
        created?: number;
        charges?: number;
        terms?: number[];
        error?: string;
      };
      if (!r.ok) throw new Error(j.error ?? "Could not assign bill");
      const termNote =
        billingRound === "per_term" && j.terms?.length
          ? ` across terms ${j.terms.join(", ")}`
          : "";
      setMessage(
        `Bill assigned (${formatUgx(amountUgx)}${termNote}). Student is on the fee ledger.`,
      );
      onAssigned?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not assign bill");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a101f] p-5">
        <SchoolModalHeader onBack={onClose} title="Assign bill" subtitle={studentName} />
        <div className="mt-4 space-y-3">
          <SchoolBillingRoundSelect value={billingRound} onChange={setBillingRound} />
          {billingRound !== "per_term" ? (
            <SchoolTermSelect value={term} onChange={(n) => setTerm(n)} />
          ) : (
            <p className="text-xs text-slate-500">Charges will be created for every term in Set Terms.</p>
          )}
          <select
            value={accountId}
            onChange={(e) => {
              const id = e.target.value;
              setAccountId(id);
              const acc = accounts.find((a) => a.id === id);
              if (acc?.defaultAmountUgx && acc.defaultAmountUgx > 0) {
                setAmountUgx(acc.defaultAmountUgx);
              }
            }}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="">Income account (fee head)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.defaultAmountUgx ? ` — ${formatUgx(a.defaultAmountUgx)}` : ""}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={amountUgx || ""}
            onChange={(e) => setAmountUgx(Number(e.target.value))}
            placeholder="Amount UGX"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </div>
        {message ? <p className="mt-3 text-sm text-emerald-400">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void assign()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Assigning…" : "Assign bill"}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { SchoolBillingRoundSelect } from "@/components/admin/school/SchoolBillingRoundSelect";
import { SchoolModalHeader } from "@/components/admin/school/SchoolModalHeader";
import { SchoolTermSelect } from "@/components/admin/school/SchoolTermSelect";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import type { SchoolBillingRound } from "@/lib/school-billing-rounds";

type Account = { id: string; name: string; defaultAmountUgx?: number };
type ExistingCharge = {
  id: string;
  schoolAccountId?: string;
  accountName: string;
  amountUgx: number;
  term: number;
  notes?: string | null;
  billingRoundLabel?: string;
};

type Props = {
  studentId: string;
  studentName: string;
  open: boolean;
  onClose: () => void;
  onAssigned?: () => void;
  /** Open Record Payment for the same student (mirrors Assign bill on pay modal). */
  onRecordPayment?: () => void;
};

export function SchoolBillStudentModal({
  studentId,
  studentName,
  open,
  onClose,
  onAssigned,
  onRecordPayment,
}: Props) {
  const { schoolFetch, organizationSlug } = useSchoolAdminApi();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [existing, setExisting] = useState<ExistingCharge[]>([]);
  const [term, setTerm] = useState(1);
  const [billingRound, setBillingRound] = useState<SchoolBillingRound>("once");
  const [accountId, setAccountId] = useState("");
  const [amountUgx, setAmountUgx] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadExisting = useCallback(
    async (activeTerm: number) => {
      const r = await schoolFetch("/api/admin/school/bills", undefined, {
        studentId,
        term: String(activeTerm),
      });
      if (!r.ok) {
        setExisting([]);
        return;
      }
      const j = (await r.json()) as { charges?: ExistingCharge[] };
      setExisting(j.charges ?? []);
    },
    [schoolFetch, studentId],
  );

  const loadMeta = useCallback(async () => {
    const [accR, sessR] = await Promise.all([
      schoolFetch("/api/admin/school/accounts", undefined, { kind: "income" }),
      schoolFetch("/api/admin/school/sessions"),
    ]);
    let activeTerm = 1;
    if (accR.ok) {
      const j = (await accR.json()) as { accounts?: Account[] };
      setAccounts(j.accounts ?? []);
    }
    if (sessR.ok) {
      const j = (await sessR.json()) as { context?: { activeTerm?: number } };
      if (j.context?.activeTerm) {
        activeTerm = j.context.activeTerm;
        setTerm(activeTerm);
      }
    }
    await loadExisting(activeTerm);
  }, [schoolFetch, loadExisting]);

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

  useEffect(() => {
    if (!open || billingRound === "per_term") return;
    void loadExisting(term);
  }, [open, term, billingRound, loadExisting]);

  const billedAccountIds = useMemo(
    () => new Set(existing.map((c) => c.schoolAccountId).filter(Boolean) as string[]),
    [existing],
  );

  const availableAccounts = useMemo(() => {
    const billedNames = new Set(existing.map((c) => c.accountName.trim().toLowerCase()));
    return accounts.filter((a) => {
      if (billedAccountIds.has(a.id)) return false;
      if (billingRound === "once" || billingRound === "per_session") {
        return !billedNames.has(a.name.trim().toLowerCase());
      }
      return true;
    });
  }, [accounts, existing, billedAccountIds, billingRound]);

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
        skipped?: number;
        charges?: number;
        terms?: number[];
        message?: string;
        error?: string;
      };
      if (!r.ok) throw new Error(j.error ?? "Could not assign bill");
      if ((j.created ?? j.charges ?? 0) === 0 && (j.skipped ?? 0) > 0) {
        setError(j.message ?? "Already billed for this fee head in the selected term.");
      } else {
        const termNote =
          billingRound === "per_term" && j.terms?.length
            ? ` across terms ${j.terms.join(", ")}`
            : "";
        setMessage(
          j.message ??
            `Bill assigned (${formatUgx(amountUgx)}${termNote}). Student is on the fee ledger.`,
        );
        setAccountId("");
        setAmountUgx(0);
        setNotes("");
        onAssigned?.();
      }
      await loadExisting(term);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not assign bill");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[min(92dvh,720px)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0a101f] p-5">
        <SchoolModalHeader onBack={onClose} title="Assign bill" subtitle={studentName} />

        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Already billed · Term {term}
          </p>
          {existing.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No bills for this student in the selected term yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {existing.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{c.accountName}</p>
                    <p className="text-[11px] text-slate-500">
                      {c.billingRoundLabel ? `${c.billingRoundLabel} · ` : ""}
                      Term {c.term}
                      {c.notes ? ` · ${c.notes}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-cyan-200">
                    {formatUgx(c.amountUgx)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

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
              const acc = availableAccounts.find((a) => a.id === id) ?? accounts.find((a) => a.id === id);
              if (acc?.defaultAmountUgx && acc.defaultAmountUgx > 0) {
                setAmountUgx(acc.defaultAmountUgx);
              }
            }}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="">Income account (fee head)</option>
            {availableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.defaultAmountUgx ? ` — ${formatUgx(a.defaultAmountUgx)}` : ""}
              </option>
            ))}
          </select>
          {availableAccounts.length === 0 && accounts.length > 0 ? (
            <p className="text-xs text-amber-300">
              All fee heads are already billed for this student in term {term}. Pick another term or change rounds.
            </p>
          ) : null}
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
        {onRecordPayment ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRecordPayment}
              className="rounded-lg border border-cyan-500/40 bg-cyan-900/40 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-800/50"
            >
              Record Payment
            </button>
            <span className="text-xs text-slate-500">Record cash/MoMo against this student’s bills.</span>
          </div>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy || availableAccounts.length === 0}
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

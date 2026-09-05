"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

type LedgerRow = {
  studentId: string;
  studentName: string;
  admissionNo: string;
  classCode: string | null;
  className: string | null;
  term: number;
  termLabel: string;
  feeRequiredUgx: number;
  discountUgx: number;
  previousBalanceUgx: number;
  previousBalancePaidUgx: number;
  currentTermPaidUgx: number;
  currentBalanceUgx: number;
  totalOutstandingUgx: number;
  status: string;
  statusLabel: string;
  statusNote: string;
  latestPaymentId: string | null;
  latestReceiptNo: string | null;
};

type Totals = {
  feeRequiredUgx: number;
  previousBalanceUgx: number;
  previousBalancePaidUgx: number;
  currentTermPaidUgx: number;
  totalOutstandingUgx: number;
  studentCount: number;
  clearedCount: number;
  partialCount: number;
  unpaidCount: number;
};

function statusClass(status: string): string {
  if (status === "cleared") return "text-emerald-400";
  if (status === "partial_payment") return "text-amber-300";
  if (status === "left") return "text-slate-400";
  if (status === "unpaid") return "text-rose-400";
  return "text-slate-300";
}

function FeeLedgerInner() {
  const searchParams = useSearchParams();
  const { schoolFetch, schoolUrl, needsOrgSlug, hrefWithOrgSlug, organizationSlug } = useSchoolAdminApi();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [term, setTerm] = useState(() => {
    const t = Number(searchParams.get("term"));
    return t === 1 || t === 2 || t === 3 ? t : 1;
  });
  const [termReady, setTermReady] = useState(() => {
    const t = Number(searchParams.get("term"));
    return t === 1 || t === 2 || t === 3;
  });
  const [q, setQ] = useState(() => searchParams.get("q")?.trim() ?? "");
  const [focusStudentId, setFocusStudentId] = useState(() => searchParams.get("studentId")?.trim() ?? "");
  const returnPay = searchParams.get("returnPay") === "1";
  const returnStudentName = searchParams.get("studentName")?.trim() || q || "Student";
  const [error, setError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [adjustStudent, setAdjustStudent] = useState<LedgerRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustKind, setAdjustKind] = useState<"discount" | "scholarship" | "waiver">("discount");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustBusy, setAdjustBusy] = useState(false);

  useEffect(() => {
    if (termReady || needsOrgSlug) return;
    void schoolFetch("/api/admin/school/sessions")
      .then((r) => r.json())
      .then((j: { context?: { activeTerm?: number } }) => {
        const t = j.context?.activeTerm;
        if (t === 1 || t === 2 || t === 3) setTerm(t);
      })
      .finally(() => setTermReady(true));
  }, [termReady, needsOrgSlug, schoolFetch]);

  const load = useCallback(async () => {
    if (needsOrgSlug || !termReady) return;
    const r = await schoolFetch("/api/admin/school/fee-ledger", undefined, {
      term,
      q: q.trim() || undefined,
      studentId: focusStudentId || undefined,
    });
    const j = (await r.json()) as {
      rows?: LedgerRow[];
      row?: LedgerRow;
      totals?: Totals;
      error?: string;
      term?: number;
    };
    if (!r.ok) {
      setError(j.error ?? "Failed to load fee ledger");
      return;
    }
    setError(null);
    if (j.row) {
      setRows([j.row]);
      if (!q.trim()) setQ(j.row.studentName || j.row.admissionNo || "");
      setTotals(null);
    } else {
      setRows(j.rows ?? []);
      setTotals(j.totals ?? null);
    }
    if (j.term) setTerm(j.term);
  }, [needsOrgSlug, termReady, schoolFetch, term, q, focusStudentId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  async function onImport(file: File | null) {
    if (!file) return;
    setImportBusy(true);
    setImportMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("term", String(term));
      if (organizationSlug) form.set("organizationSlug", organizationSlug);
      const r = await fetch("/api/admin/school/fee-ledger/import", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const j = (await r.json()) as {
        error?: string;
        createdStudents?: number;
        updatedStudents?: number;
        billsUpserted?: number;
        paymentsCreated?: number;
        errors?: string[];
      };
      if (!r.ok) throw new Error(j.error ?? "Import failed");
      setImportMessage(
        `Imported: ${j.createdStudents ?? 0} new students, ${j.updatedStudents ?? 0} updated, ${j.billsUpserted ?? 0} bills, ${j.paymentsCreated ?? 0} payments.` +
          (j.errors?.length ? ` Warnings: ${j.errors.slice(0, 3).join("; ")}` : ""),
      );
      await load();
    } catch (e) {
      setImportMessage(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportBusy(false);
    }
  }

  async function applyAdjustment() {
    if (!adjustStudent) return;
    setAdjustBusy(true);
    try {
      const r = await schoolFetch("/api/admin/school/fee-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationSlug,
          studentId: adjustStudent.studentId,
          term,
          amountUgx: parseInt(adjustAmount.replace(/[^\d]/g, ""), 10) || 0,
          kind: adjustKind,
          note: adjustNote,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Adjustment failed");
      setAdjustStudent(null);
      setAdjustAmount("");
      setAdjustNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Adjustment failed");
    } finally {
      setAdjustBusy(false);
    }
  }

  function shareReceipt(r: LedgerRow) {
    if (!r.latestPaymentId) return;
    const url = `${window.location.origin}/receipt/${r.latestPaymentId}`;
    const text = `${r.studentName} receipt ${r.latestReceiptNo || ""} — ${url}`;
    if (navigator.share) {
      void navigator.share({ title: "Fee receipt", text, url }).catch(() => undefined);
    } else {
      void navigator.clipboard.writeText(url);
      setImportMessage("Receipt link copied");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Student fee ledger</h1>
          <p className="text-sm text-slate-400">
            Spreadsheet-style balances: fee required, previous balance, payments, and outstanding — per student.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={schoolUrl("/api/admin/school/fee-ledger/import")}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-cyan-300 hover:bg-white/5"
          >
            Download CSV template
          </a>
          <label className="cursor-pointer rounded-lg border border-violet-500/35 bg-violet-950/30 px-3 py-2 text-sm text-violet-100 hover:border-violet-400/50">
            {importBusy ? "Importing…" : "Import spreadsheet CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importBusy}
              onChange={(e) => void onImport(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {needsOrgSlug ? (
        <p className="text-sm text-amber-300">Select a school organization slug in the workspace bar first.</p>
      ) : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {importMessage ? <p className="text-sm text-cyan-200">{importMessage}</p> : null}

      {returnPay && focusStudentId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-950/30 px-4 py-3">
          <p className="text-sm text-emerald-100">
            Viewing ledger for <span className="font-semibold">{returnStudentName}</span>
          </p>
          <Link
            href={hrefWithOrgSlug(
              `/admin/students?payStudentId=${encodeURIComponent(focusStudentId)}&payStudentName=${encodeURIComponent(returnStudentName)}&term=${term}`,
            )}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            ← Back to Pay bill
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-300">
          Term
          <select
            value={term}
            onChange={(e) => setTerm(Number(e.target.value))}
            className="ml-2 rounded-lg border border-white/15 bg-[#0a101f] px-3 py-2 text-white"
          >
            <option value={1}>Term 1</option>
            <option value={2}>Term 2 (Jun–Aug)</option>
            <option value={3}>Term 3 (Jul–Sept)</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Search
          <input
            value={q}
            onChange={(e) => {
              setFocusStudentId("");
              setQ(e.target.value);
            }}
            placeholder="Name or admission no."
            className="ml-2 rounded-lg border border-white/15 bg-[#0a101f] px-3 py-2 text-white"
          />
        </label>
        <Link
          href={hrefWithOrgSlug("/admin/students")}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
        >
          Students / bills
        </Link>
      </div>

      {totals ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm">
            <p className="text-slate-400">Students</p>
            <p className="text-xl font-semibold text-white">{totals.studentCount}</p>
            <p className="text-xs text-slate-500">
              Cleared {totals.clearedCount} · Partial {totals.partialCount} · Unpaid {totals.unpaidCount}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm">
            <p className="text-slate-400">Fees expected</p>
            <p className="text-xl font-semibold text-white">{formatUgx(totals.feeRequiredUgx + totals.previousBalanceUgx)}</p>
            <p className="text-xs text-slate-500">
              Term {formatUgx(totals.feeRequiredUgx)} + arrears {formatUgx(totals.previousBalanceUgx)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm">
            <p className="text-slate-400">Collected</p>
            <p className="text-xl font-semibold text-emerald-300">
              {formatUgx(totals.previousBalancePaidUgx + totals.currentTermPaidUgx)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm">
            <p className="text-slate-400">Outstanding</p>
            <p className="text-xl font-semibold text-rose-300">{formatUgx(totals.totalOutstandingUgx)}</p>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="bg-[#0a101f] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Admission</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">Term</th>
              <th className="px-3 py-2 text-right">Fee required</th>
              <th className="px-3 py-2 text-right">Prev. bal.</th>
              <th className="px-3 py-2 text-right">Prev. paid</th>
              <th className="px-3 py-2 text-right">Term paid</th>
              <th className="px-3 py-2 text-right">Outstanding</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="px-3 py-2">
                  <Link href={hrefWithOrgSlug(`/admin/students/${r.studentId}`)} className="text-cyan-300 hover:underline">
                    {r.studentName}
                  </Link>
                  {r.statusNote ? <p className="text-xs text-rose-300">{r.statusNote}</p> : null}
                  {(r.discountUgx ?? 0) > 0 ? (
                    <p className="text-xs text-violet-300">Discount {formatUgx(r.discountUgx ?? 0)}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.admissionNo || "—"}</td>
                <td className="px-3 py-2">{r.classCode ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.termLabel}</td>
                <td className="px-3 py-2 text-right font-mono">{formatUgx(r.feeRequiredUgx)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatUgx(r.previousBalanceUgx)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatUgx(r.previousBalancePaidUgx)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatUgx(r.currentTermPaidUgx)}</td>
                <td className={`px-3 py-2 text-right font-mono ${r.totalOutstandingUgx > 0 ? "text-rose-300" : "text-emerald-300"}`}>
                  {r.totalOutstandingUgx > 0 ? formatUgx(r.totalOutstandingUgx) : "CLEARED"}
                </td>
                <td className={`px-3 py-2 ${statusClass(r.status)}`}>{r.statusLabel}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <Link
                      href={hrefWithOrgSlug(
                        `/admin/students?payStudentId=${encodeURIComponent(r.studentId)}&payStudentName=${encodeURIComponent(r.studentName)}&term=${term}`,
                      )}
                      className="rounded border border-emerald-500/35 bg-emerald-950/40 px-1.5 py-0.5 text-emerald-200 hover:bg-emerald-900/50"
                    >
                      Pay bill
                    </Link>
                    <button
                      type="button"
                      onClick={() => setAdjustStudent(r)}
                      className="rounded border border-violet-400/30 px-1.5 py-0.5 text-violet-200 hover:bg-violet-500/10"
                    >
                      Adjust
                    </button>
                    {r.latestPaymentId ? (
                      <>
                        <a
                          href={`/api/receipts/${r.latestPaymentId}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-emerald-400/30 px-1.5 py-0.5 text-emerald-200 hover:bg-emerald-500/10"
                        >
                          PDF
                        </a>
                        <button
                          type="button"
                          onClick={() => shareReceipt(r)}
                          className="rounded border border-white/15 px-1.5 py-0.5 text-slate-300 hover:bg-white/5"
                        >
                          Share
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-slate-500">
                  No ledger rows yet. Import a spreadsheet CSV or assign bills under Students / bills.
                </td>
              </tr>
            ) : null}
          </tbody>
          {totals && rows.length > 0 ? (
            <tfoot className="border-t border-rose-500/30 bg-rose-950/20 text-rose-200">
              <tr>
                <td className="px-3 py-2 font-semibold" colSpan={4}>
                  TOTAL
                </td>
                <td className="px-3 py-2 text-right font-mono">{formatUgx(totals.feeRequiredUgx)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatUgx(totals.previousBalanceUgx)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatUgx(totals.previousBalancePaidUgx)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatUgx(totals.currentTermPaidUgx)}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{formatUgx(totals.totalOutstandingUgx)}</td>
                <td className="px-3 py-2" colSpan={2} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {adjustStudent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0a101f] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Discount / scholarship / waiver</h3>
            <p className="mt-1 text-sm text-slate-400">{adjustStudent.studentName}</p>
            <label className="mt-4 block text-xs text-slate-400">
              Kind
              <select
                value={adjustKind}
                onChange={(e) => setAdjustKind(e.target.value as typeof adjustKind)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
              >
                <option value="discount">Discount</option>
                <option value="scholarship">Scholarship</option>
                <option value="waiver">Waiver</option>
              </select>
            </label>
            <label className="mt-3 block text-xs text-slate-400">
              Amount (UGX)
              <input
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="mt-3 block text-xs text-slate-400">
              Note
              <input
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjustStudent(null)}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adjustBusy}
                onClick={() => void applyAdjustment()}
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {adjustBusy ? "Saving…" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function FeeLedgerPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Loading fee ledger…</p>}>
      <FeeLedgerInner />
    </Suspense>
  );
}

"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPaymentsMobileList } from "@/components/admin/AdminPaymentsMobileList";
import { ReceiptPreviewModal } from "@/components/admin/ReceiptPreviewModal";
import { TenantList } from "@/components/tuition/TenantList";
import type { BalanceProgrammeProgress } from "@/components/tuition/TuitionBalancePanel";
import { useTuitionAdminGate } from "@/hooks/useTuitionAdminGate";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";
import { useSchoolClassFilter } from "@/hooks/useSchoolClassFilter";

type PaymentRow = {
  id: string;
  studentName: string;
  studentId: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode?: string;
  totalUgx: number;
  tonAmount: number;
  txHash: string;
  status: string;
  rail: string;
  createdAt: string;
  confirmedAt?: string | null;
  organizationSlug?: string;
  organizationName?: string;
  progress?: BalanceProgrammeProgress | null;
};

type FilterStatus = "" | "pending" | "confirmed" | "failed" | "refunded";
type FilterRail = "" | "telegram" | "web" | "momo_bridge" | "mbiyo" | "livepay";

function abbrevTx(s: string, head = 4, tail = 4): string {
  const t = s.trim();
  if (!t) return "—";
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

function programmeLabel(code: string, year: number, semester: number, mode?: string): string {
  const short = (code.split(/[-/]/)[0] ?? code).trim();
  return `${short} Yr${year} Sem${semester}${mode === "year" ? " (year bundle)" : ""}`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "confirmed") {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white"
        title="Confirmed"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="sr-only">Confirmed</span>
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-500"
        title="Pending"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 12a8 8 0 0113.66-5.66M20 12a8 8 0 01-13.66 5.66" strokeLinecap="round" />
          <path d="M16 4v4h-4M8 20v-4h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">Pending</span>
      </span>
    );
  }
  return (
    <span className="text-xs font-medium capitalize text-rose-600" title={status}>
      {status}
    </span>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 2a.75.75 0 01.75.75v7.59l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V2.75A.75.75 0 0110 2z" />
      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
  );
}

function AdminPaymentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: authLoading, ensureTuitionSession } = useTuitionAdminGate();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState("");
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("");
  const [filterRail, setFilterRail] = useState<FilterRail>("");
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [manualConfirmAllowed, setManualConfirmAllowed] = useState(true);
  const [isMaster, setIsMaster] = useState(false);
  const { orgSlug, setOrgSlug } = useMasterOrgSlug();
  const organizationSlugFilter = orgSlug;
  const setOrganizationSlugFilter = setOrgSlug;
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [schoolClassId] = useSchoolClassFilter();

  useEffect(() => {
    const status = searchParams.get("status");
    if (
      status === "pending" ||
      status === "confirmed" ||
      status === "failed" ||
      status === "refunded"
    ) {
      setFilterStatus(status);
    }
    const highlight = searchParams.get("highlight")?.trim();
    if (highlight) setHighlightId(highlight);
  }, [searchParams]);

  const load = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    const gate = ensureTuitionSession({
      message:
        "Sign in with your tuition hub admin account (email and password) to view payments.",
    });
    if (!gate.ok) {
      if (gate.error) setError(gate.error);
      if (!gate.redirecting) setRows([]);
      setLoading(false);
      return;
    }
    setError(null);
    setManualConfirmAllowed(gate.auth.paymentOps?.manualConfirmAllowed !== false);
    const master = gate.auth.admin?.role === "master";
    setIsMaster(master);

    const q = new URLSearchParams();
    q.set("limit", master ? "500" : "200");
    if (filterStatus) q.set("status", filterStatus);
    if (filterRail) q.set("rail", filterRail);
    if (schoolClassId) q.set("schoolClassId", schoolClassId);
    const slugTrim = organizationSlugFilter.trim().toLowerCase();
    if (slugTrim && master) q.set("organizationSlug", slugTrim);

    const r = await fetch(`/api/payments?${q.toString()}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error ?? "Failed to load");
      setLoading(false);
      return;
    }
    const payments = (j.payments ?? []) as PaymentRow[];
    setRows(payments);
    if (highlightId) {
      const match = payments.find((p) => p.id === highlightId);
      if (match) setSelected(match);
    }
    setLoading(false);
  }, [
    authLoading,
    ensureTuitionSession,
    filterStatus,
    filterRail,
    organizationSlugFilter,
    highlightId,
    schoolClassId,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCsv() {
    const q = new URLSearchParams();
    if (isMaster && organizationSlugFilter.trim()) {
      q.set("organizationSlug", organizationSlugFilter.trim().toLowerCase());
    }
    const qs = q.toString();
    const r = await fetch(`/api/payments/export${qs ? `?${qs}` : ""}`, { credentials: "include" });
    if (r.status === 401) {
      router.replace("/school/login");
      return;
    }
    if (!r.ok) return;
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `odelhub-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function confirm() {
    if (!selected) return;
    const r = await fetch(`/api/payments/${selected.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "confirmed",
        ...(tx.trim() ? { txHash: tx.trim() } : {}),
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error ?? (j.hint ? `${j.error}: ${j.hint}` : "Update failed"));
      return;
    }
    setSelected(null);
    setTx("");
    await load();
  }

  async function refundPayment(paymentId: string) {
    const note = window.prompt("Refund note (optional):") ?? "";
    setRefundingId(paymentId);
    setError(null);
    try {
      const r = await fetch(`/api/payments/${paymentId}/refund`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Refund failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setRefundingId(null);
    }
  }

  async function cancelPending(paymentId: string) {
    setCancellingId(paymentId);
    setError(null);
    try {
      const r = await fetch(`/api/payments/${paymentId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Cancel failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">All Payments</h1>
        <button
          type="button"
          onClick={() => void exportCsv()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <DownloadIcon className="h-4 w-4 text-slate-500" />
          Export
        </button>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {isMaster ? (
        <TenantList
          variant="compact"
          filterMode
          currentSlug={organizationSlugFilter || undefined}
          onPickSlug={(slug) => setOrganizationSlugFilter(slug)}
          title="Filter by school (tenant)"
          description="Click a school to filter payments, or use the slug field below."
        />
      ) : null}

      {!manualConfirmAllowed ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Manual confirm is disabled. Payments confirm via TON cron and MoMo webhooks.
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <label className="text-xs font-medium text-slate-500">
          Status
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="mt-1 block rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">
          Rail
          <select
            value={filterRail}
            onChange={(e) => setFilterRail(e.target.value as FilterRail)}
            className="mt-1 block rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"
          >
            <option value="">All</option>
            <option value="telegram">Telegram</option>
            <option value="web">Web</option>
            <option value="momo_bridge">MoMo</option>
            <option value="mbiyo">Mbiyo (OpenPayGB)</option>
            <option value="livepay">LivePay (OpenPayGB)</option>
          </select>
        </label>
        {isMaster ? (
          <label className="text-xs font-medium text-slate-500">
            School slug
            <input
              value={organizationSlugFilter}
              onChange={(e) => setOrganizationSlugFilter(e.target.value.trim().toLowerCase())}
              placeholder="all tenants"
              className="mt-1 block rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs text-slate-800 placeholder:text-slate-400"
            />
          </label>
        ) : null}
      </div>

      <AdminPaymentsMobileList
        loading={loading}
        rows={rows}
        isMaster={isMaster}
        manualConfirmAllowed={manualConfirmAllowed}
        cancellingId={cancellingId}
        refundingId={refundingId}
        onCancel={(id) => void cancelPending(id)}
        onConfirm={(row) => {
          setSelected(row);
          setTx("");
        }}
        onReceipt={setReceiptId}
        onRefund={(id) => void refundPayment(id)}
      />

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                {isMaster ? <th className="px-4 py-3">School</th> : null}
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">In TON</th>
                <th className="px-4 py-3">Tx Hash</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={isMaster ? 8 : 7} className="px-4 py-10 text-center text-slate-500">
                    Loading payments…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={isMaster ? 8 : 7} className="px-4 py-10 text-center text-slate-500">
                    No payments found.
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/admin/students/${p.studentId}`} className="hover:text-blue-600 hover:underline">
                        {p.studentName || "—"}
                      </Link>
                    </td>
                    {isMaster ? (
                      <td className="max-w-[180px] px-4 py-3 text-xs text-slate-600">
                        <span className="font-medium text-slate-700">{p.organizationName ?? "—"}</span>
                        {p.organizationSlug ? (
                          <span className="ml-1 font-mono text-slate-400">({p.organizationSlug})</span>
                        ) : null}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-slate-700">
                      <p>{programmeLabel(p.programmeCode, p.year, p.semester, p.feeSelectionMode)}</p>
                      {p.progress ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {p.progress.completedSemesters}/{p.progress.totalSemesters} semesters complete ·{" "}
                          {p.progress.remainingYears} year(s), {p.progress.remainingSemesters} semester(s) remaining
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-800">UGX {p.totalUgx.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{p.tonAmount.toFixed(2)}</td>
                    <td
                      className="max-w-[120px] px-4 py-3 font-mono text-xs text-slate-500"
                      title={p.txHash || undefined}
                    >
                      {abbrevTx(p.txHash)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusIcon status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "pending" ? (
                        <span className="inline-flex flex-col items-end gap-1">
                          <button
                            type="button"
                            disabled={cancellingId === p.id}
                            onClick={() => void cancelPending(p.id)}
                            className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-50"
                          >
                            {cancellingId === p.id ? "Cancelling…" : "Cancel"}
                          </button>
                          {manualConfirmAllowed ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(p);
                                setTx("");
                              }}
                              className="text-xs font-medium text-emerald-700 hover:underline"
                            >
                              Confirm
                            </button>
                          ) : null}
                        </span>
                      ) : null}
                      {p.status === "confirmed" ? (
                        <span className="inline-flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => setReceiptId(p.id)}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Receipt
                          </button>
                          <button
                            type="button"
                            disabled={refundingId === p.id}
                            onClick={() => void refundPayment(p.id)}
                            className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-50"
                          >
                            {refundingId === p.id ? "Refunding…" : "Refund"}
                          </button>
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiptPreviewModal paymentId={receiptId} open={receiptId !== null} onClose={() => setReceiptId(null)} />

      {selected ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-xl">
            <h2 className="text-lg font-semibold text-slate-900">Confirm payment</h2>
            <p className="mt-2 text-xs text-slate-500">
              {selected.studentName} · {programmeLabel(selected.programmeCode, selected.year, selected.semester, selected.feeSelectionMode)} · UGX{" "}
              {selected.totalUgx.toLocaleString()} · {selected.tonAmount} TON
            </p>
            <label className="mt-4 block text-xs font-medium text-slate-500">Transaction hash</label>
            <input
              value={tx}
              onChange={(e) => setTx(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900"
              placeholder="EQDS…"
            />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="min-h-[48px] rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 sm:min-h-0 sm:py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                className="min-h-[48px] rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 sm:min-h-0 sm:py-1.5"
              >
                Mark confirmed
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading payments…</p>}>
      <AdminPaymentsPageInner />
    </Suspense>
  );
}

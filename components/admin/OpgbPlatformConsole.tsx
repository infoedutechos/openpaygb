"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TabbedCardPanel } from "@/components/ui/TabbedCardPanel";
import { MasterOpenPayCardsOverview } from "@/components/admin/MasterOpenPayCardsOverview";
import { MasterOpenPayCardSettings } from "@/components/admin/MasterOpenPayCardSettings";
import { MasterPartnerIntegrations } from "@/components/admin/MasterPartnerIntegrations";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";

type Kpis = {
  developerApps: number;
  whiteLabelApps: number;
  totalCharges: number;
  pendingCharges: number;
  confirmedCharges: number;
  lifetimeCustomerPaidUgx: number;
  lifetimeOrderUgx: number;
  lifetimePlatformFeesUgx: number;
  lifetimeMerchantNetUgx: number;
  merchantSettlementFloatUgx: number;
  pendingMerchantPayouts: number;
  pendingWithdraws: number;
  openDisputes: number;
  openPayCards: number;
};

type ChargeRow = {
  id: string;
  status: string;
  orderAmountUgx: number;
  amountUgx: number;
  platformFeeUgx: number;
  merchantNetUgx: number;
  createdAt: string;
  appName: string;
  appSlug: string;
  whiteLabelMode: boolean;
};

type FeeSettings = {
  merchantChargePlatformFeeKind: string;
  merchantChargePlatformFeeUgx: number;
  merchantChargePlatformFeePercent: number;
  merchantChargePlatformFeeMinUgx: number;
  whiteLabelFeeKind: string;
  whiteLabelFeeUgx: number;
  whiteLabelFeePercent: number;
  whiteLabelActivationFeeUgx: number;
};

type DisputeRow = {
  id: string;
  status: string;
  reason: string;
  createdAt: string;
  escrow: {
    amountUgx: number;
    referenceKey: string;
    offer: { amount: number; asset: string };
  };
};

type WithdrawRow = {
  id: string;
  studentId: string;
  asset: string;
  amount: number;
  amountUgx: number;
  rail: string;
  destination: string;
  status: string;
  referenceKey: string;
  createdAt: string;
};

function formatUgx(n: number): string {
  return `UGX ${n.toLocaleString("en-UG")}`;
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-4">
      <p className="text-[10px] uppercase tracking-wider text-violet-300/80">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function OpsQueuesPanel() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [withdraws, setWithdraws] = useState<WithdrawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dRes, wRes] = await Promise.all([
        fetch("/api/master/dex-p2p-disputes"),
        fetch("/api/master/opgb-withdraws"),
      ]);
      const dData = await dRes.json();
      const wData = await wRes.json();
      if (!dRes.ok) throw new Error(dData.error || "Failed to load disputes");
      if (!wRes.ok) throw new Error(wData.error || "Failed to load withdraws");
      setDisputes(dData.disputes ?? []);
      setWithdraws(wData.withdraws ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ops queues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolveDispute(disputeId: string, resolution: "release" | "refund") {
    setBusyId(disputeId);
    setError(null);
    try {
      const res = await fetch("/api/master/dex-p2p-disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disputeId, resolution, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resolve failed");
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function actWithdraw(requestId: string, action: "complete" | "reject") {
    setBusyId(requestId);
    setError(null);
    try {
      const res = await fetch("/api/master/opgb-withdraws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Resolve P2P escrow disputes and process custodial withdraw requests. Mark complete only after
        external disbursement, or reject to restore balances.
      </p>
      <label className="block max-w-xl">
        <span className="text-xs uppercase tracking-wide text-slate-500">Ops note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-white"
          placeholder="Reference / reason for audit trail"
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-400">Loading queues…</p> : null}

      <div>
        <h3 className="text-sm font-semibold text-amber-100">
          Open P2P disputes <span className="text-slate-500">({disputes.length})</span>
        </h3>
        <ul className="mt-3 space-y-3">
          {disputes.length === 0 && !loading ? (
            <li className="text-sm text-slate-500">No open disputes.</li>
          ) : null}
          {disputes.map((d) => (
            <li key={d.id} className="rounded-xl border border-[var(--border)] bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {d.escrow.offer.amount} {d.escrow.offer.asset} · {formatUgx(d.escrow.amountUgx)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{d.reason}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {d.escrow.referenceKey} · {new Date(d.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => void resolveDispute(d.id, "release")}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Release
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => void resolveDispute(d.id, "refund")}
                    className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-semibold text-amber-100 disabled:opacity-50"
                  >
                    Refund buyer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-cyan-100">
          Withdraw queue <span className="text-slate-500">({withdraws.length})</span>
        </h3>
        <ul className="mt-3 space-y-3">
          {withdraws.length === 0 && !loading ? (
            <li className="text-sm text-slate-500">No pending withdraws.</li>
          ) : null}
          {withdraws.map((w) => (
            <li key={w.id} className="rounded-xl border border-[var(--border)] bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {w.amount} {w.asset.toUpperCase()} via {w.rail} → {w.destination}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatUgx(w.amountUgx)} · student …{w.studentId.slice(-6)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {w.referenceKey} · {new Date(w.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === w.id}
                    onClick={() => void actWithdraw(w.id, "complete")}
                    className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Mark paid
                  </button>
                  <button
                    type="button"
                    disabled={busyId === w.id}
                    onClick={() => void actWithdraw(w.id, "reject")}
                    className="rounded-lg border border-rose-500/40 px-3 py-2 text-xs font-semibold text-rose-100 disabled:opacity-50"
                  >
                    Reject + restore
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MerchantFeesPanel() {
  const [fees, setFees] = useState<FeeSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/master/opgb-merchant-fees", { credentials: "include" });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Load failed");
    setFees(j);
  }, []);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  async function save() {
    if (!fees) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch("/api/master/opgb-merchant-fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(fees),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Save failed");
      setFees(j);
      setMessage("Merchant & white-label fee settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!fees) {
    return <p className="text-sm text-slate-400">{error ?? "Loading fee settings…"}</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Platform defaults for Partner API / hosted checkout charges. Per-app overrides still apply on
        Developer Apps. White-label adds an extra OPGB fee while <code className="text-violet-200">whiteLabelMode</code>{" "}
        is on, plus an optional one-time activation debit from settlement.
      </p>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-200">{message}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-slate-400">
          Base platform fee kind
          <select
            value={fees.merchantChargePlatformFeeKind}
            onChange={(e) => setFees({ ...fees, merchantChargePlatformFeeKind: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            <option value="percent">Percent</option>
            <option value="fixed_ugx">Fixed UGX</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          Base percent
          <input
            value={fees.merchantChargePlatformFeePercent}
            onChange={(e) =>
              setFees({ ...fees, merchantChargePlatformFeePercent: Number(e.target.value) || 0 })
            }
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Base fixed UGX
          <input
            value={fees.merchantChargePlatformFeeUgx}
            onChange={(e) =>
              setFees({ ...fees, merchantChargePlatformFeeUgx: Math.round(Number(e.target.value) || 0) })
            }
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Min fee UGX (percent)
          <input
            value={fees.merchantChargePlatformFeeMinUgx}
            onChange={(e) =>
              setFees({
                ...fees,
                merchantChargePlatformFeeMinUgx: Math.round(Number(e.target.value) || 0),
              })
            }
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <div className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-950/15 p-4">
        <h3 className="text-sm font-semibold text-fuchsia-100">White-label pricing</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Per-charge white-label fee kind
            <select
              value={fees.whiteLabelFeeKind}
              onChange={(e) => setFees({ ...fees, whiteLabelFeeKind: e.target.value })}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="percent">Percent of order</option>
              <option value="fixed_ugx">Fixed UGX</option>
              <option value="none">None (branding only)</option>
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            White-label percent
            <input
              value={fees.whiteLabelFeePercent}
              onChange={(e) =>
                setFees({ ...fees, whiteLabelFeePercent: Number(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            White-label fixed UGX
            <input
              value={fees.whiteLabelFeeUgx}
              onChange={(e) =>
                setFees({ ...fees, whiteLabelFeeUgx: Math.round(Number(e.target.value) || 0) })
              }
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            One-time activation fee UGX
            <input
              value={fees.whiteLabelActivationFeeUgx}
              onChange={(e) =>
                setFees({
                  ...fees,
                  whiteLabelActivationFeeUgx: Math.round(Number(e.target.value) || 0),
                })
              }
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Save fee settings
      </button>
    </div>
  );
}

export function OpgbPlatformConsole() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await fetch("/api/master/opgb-console", { credentials: "include", cache: "no-store" });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Could not load OPGB console");
    setKpis(j.kpis);
    setCharges(j.recentCharges ?? []);
  }, []);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  const overview = useMemo(
    () => (
      <div className="space-y-6">
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {!kpis ? (
          <p className="text-sm text-slate-400">Loading platform KPIs…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Developer apps" value={String(kpis.developerApps)} hint={`${kpis.whiteLabelApps} white-label`} />
            <KpiCard label="OpenPayGB cards" value={String(kpis.openPayCards)} />
            <KpiCard
              label="Confirmed charges"
              value={String(kpis.confirmedCharges)}
              hint={`${kpis.pendingCharges} pending`}
            />
            <KpiCard label="OPGB fees earned" value={formatUgx(kpis.lifetimePlatformFeesUgx)} />
            <KpiCard label="Merchant float" value={formatUgx(kpis.merchantSettlementFloatUgx)} />
            <KpiCard label="Pending cashouts" value={String(kpis.pendingMerchantPayouts)} />
            <KpiCard label="Pending withdraws" value={String(kpis.pendingWithdraws)} />
            <KpiCard label="Open disputes" value={String(kpis.openDisputes)} />
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href="/opgb" className="rounded-lg border border-white/15 px-3 py-2 text-slate-200 hover:border-violet-400/40">
            Public /opgb lobby
          </Link>
          <Link
            href="/developers/dashboard"
            className="rounded-lg border border-white/15 px-3 py-2 text-slate-200 hover:border-violet-400/40"
          >
            Developer dashboard
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-white/15 px-3 py-2 text-slate-300 hover:bg-white/5"
          >
            Refresh KPIs
          </button>
        </div>
      </div>
    ),
    [charges.length, error, kpis, load],
  );

  const chargesPanel = (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">Latest merchant charges across all developer apps.</p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs text-slate-300">
          <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-2 py-2">When</th>
              <th className="px-2 py-2">App</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Order</th>
              <th className="px-2 py-2">Paid</th>
              <th className="px-2 py-2">OPGB fee</th>
              <th className="px-2 py-2">Merchant net</th>
            </tr>
          </thead>
          <tbody>
            {charges.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-slate-500">
                  No merchant charges yet.
                </td>
              </tr>
            ) : (
              charges.map((c) => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="px-2 py-2 whitespace-nowrap">{new Date(c.createdAt).toLocaleString()}</td>
                  <td className="px-2 py-2">
                    {c.appName}
                    {c.whiteLabelMode ? (
                      <span className="ml-1 rounded bg-fuchsia-900/50 px-1 text-[9px] text-fuchsia-200">WL</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">{c.status}</td>
                  <td className="px-2 py-2">{formatUgx(c.orderAmountUgx || c.amountUgx)}</td>
                  <td className="px-2 py-2">{formatUgx(c.amountUgx)}</td>
                  <td className="px-2 py-2">{formatUgx(c.platformFeeUgx)}</td>
                  <td className="px-2 py-2">{formatUgx(c.merchantNetUgx)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{OPEN_PAY_BRAND}</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Platform console</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Multi-tab control center to configure fees and white-label pricing, monitor merchant charges and
          cashouts, manage OpenPayGB cards, and process withdraws / P2P disputes.
        </p>
      </header>

      <TabbedCardPanel
        defaultTabId="overview"
        tabs={[
          { id: "overview", label: "Overview", content: overview },
          { id: "charges", label: "Charges", content: chargesPanel },
          { id: "fees", label: "Fees & white-label", content: <MerchantFeesPanel /> },
          { id: "cards", label: "Cards registry", content: <MasterOpenPayCardsOverview /> },
          { id: "card-settings", label: "Card settings", content: <MasterOpenPayCardSettings /> },
          { id: "cashouts", label: "Cashouts & partners", content: <MasterPartnerIntegrations /> },
          { id: "ops", label: "Withdraws & disputes", content: <OpsQueuesPanel /> },
        ]}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { clientFetchErrorMessage } from "@/lib/client-fetch-error";

type Settlement = {
  availableBalanceUgx: number;
  pendingPayoutUgx: number;
  pendingPayoutCount: number;
  totalPaidOutUgx: number;
  lifetimeMerchantNetUgx: number;
  lifetimePlatformFeesUgx: number;
  confirmedChargeCount: number;
};

type ChargeRow = {
  id: string;
  orderAmountUgx: number;
  amountUgx: number;
  platformFeeUgx: number;
  merchantNetUgx: number;
  status: string;
  externalRef: string | null;
  description: string;
  checkoutUrl: string;
  createdAt: string;
};

type PayoutRow = {
  id: string;
  amountUgx: number;
  phone: string;
  network: string;
  status: string;
  note: string;
  rejectionReason: string | null;
  createdAt: string;
};

type AppInfo = {
  id: string;
  name: string;
  clientId: string;
  brandingName: string;
  payoutPhone?: string;
  payoutNetwork?: string;
  settlementBalanceUgx?: number;
};

export default function SchoolSettlementPage() {
  const { schoolFetch, needsOrgSlug } = useSchoolAdminApi();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [app, setApp] = useState<AppInfo | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [provisioned, setProvisioned] = useState(false);

  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutNetwork, setPayoutNetwork] = useState<"MTN" | "AIRTEL">("MTN");
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [cashoutNote, setCashoutNote] = useState("");

  const load = useCallback(async () => {
    if (needsOrgSlug) {
      setLoading(false);
      setError("Select a school organization (orgSlug) first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await schoolFetch("/api/admin/school/settlement", undefined, { limit: "40" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Load failed (${res.status})`);
      }
      const data = (await res.json()) as {
        provisioned?: boolean;
        app: AppInfo;
        settlement: Settlement;
        charges: ChargeRow[];
        payouts: PayoutRow[];
      };
      setProvisioned(Boolean(data.provisioned));
      setApp(data.app);
      setSettlement(data.settlement);
      setCharges(data.charges ?? []);
      setPayouts(data.payouts ?? []);
      setPayoutPhone(data.app.payoutPhone ?? "");
      setPayoutNetwork((data.app.payoutNetwork as "MTN" | "AIRTEL") || "MTN");
      if (data.provisioned) {
        setMessage("OpenPayGB merchant wallet created for this school.");
      }
    } catch (e) {
      setError(clientFetchErrorMessage(e, "Could not load settlement. Check the server and try Refresh."));
    } finally {
      setLoading(false);
    }
  }, [needsOrgSlug, schoolFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePayoutDestination() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await schoolFetch("/api/admin/school/settlement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutPhone, payoutNetwork }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      setApp(data.app);
      setSettlement(data.settlement ?? null);
      setMessage("Payout destination saved.");
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function requestCashout() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const amountUgx = Math.round(Number(String(cashoutAmount).replace(/,/g, "")));
      if (!Number.isFinite(amountUgx) || amountUgx < 1000) {
        throw new Error("Minimum cashout is 1,000 UGX");
      }
      if (!payoutPhone.trim()) throw new Error("Set a payout Mobile Money number first");
      const res = await schoolFetch("/api/admin/school/settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cashout",
          amountUgx,
          phone: payoutPhone.trim(),
          network: payoutNetwork,
          note: cashoutNote || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Cashout failed");
      setCashoutAmount("");
      setCashoutNote("");
      setSettlement(data.settlement ?? null);
      if (data.payout) setPayouts((prev) => [data.payout as PayoutRow, ...prev]);
      setMessage(`Cashout of ${formatUgx(amountUgx)} queued (or sandbox-paid if enabled).`);
      void load();
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function createTestCharge() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await schoolFetch("/api/admin/school/settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_charge", amountUgx: 5000, description: "School admin test charge" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Charge create failed");
      const url = data.charge?.checkoutUrl as string | undefined;
      setMessage(url ? `Test charge created — checkout: ${url}` : "Test charge created.");
      void load();
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendFeeReminders() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await schoolFetch("/api/admin/school/fee-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 25 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Reminders failed");
      setMessage(`Reminders: ${data.sent ?? 0} sent, ${data.failed ?? 0} failed (of ${data.attempted ?? 0}).`);
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading OpenPayGB settlement…</p>;
  }

  const available = settlement?.availableBalanceUgx ?? app?.settlementBalanceUgx ?? 0;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-cyan-500/25 bg-cyan-50/60 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-cyan-800">OpenPayGB · School merchant</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Settlement & cashout</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Confirmed merchant charges (hosted checkout / Partner API) credit this school&apos;s OpenPayGB settlement
          float. Cash out to MoMo when you want funds sent to the school float number. This is separate from tuition
          Cashbook / Outflow vouchers.
        </p>
        {app ? (
          <p className="mt-2 font-mono text-xs text-slate-500">
            Merchant app: {app.brandingName || app.name} · client_id {app.clientId}
          </p>
        ) : null}
        {provisioned ? (
          <p className="mt-1 text-xs text-emerald-700">Merchant wallet was provisioned automatically for this school.</p>
        ) : null}
      </header>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Available" value={formatUgx(available)} />
        <Kpi label="Pending cashouts" value={formatUgx(settlement?.pendingPayoutUgx ?? 0)} />
        <Kpi label="Paid out" value={formatUgx(settlement?.totalPaidOutUgx ?? 0)} />
        <Kpi label="Lifetime net" value={formatUgx(settlement?.lifetimeMerchantNetUgx ?? 0)} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Cashout destination</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-600">
            MoMo phone
            <input
              value={payoutPhone}
              onChange={(e) => setPayoutPhone(e.target.value)}
              placeholder="07… or 2567…"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-slate-600">
            Network
            <select
              value={payoutNetwork}
              onChange={(e) => setPayoutNetwork(e.target.value as "MTN" | "AIRTEL")}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="MTN">MTN</option>
              <option value="AIRTEL">Airtel</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void savePayoutDestination()}
          className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Save destination
        </button>
      </section>

      <section className="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-5">
        <h2 className="text-lg font-semibold text-cyan-950">Request cashout</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs text-slate-600">
            Amount (UGX)
            <div className="mt-1 flex gap-2">
              <input
                value={cashoutAmount}
                onChange={(e) => setCashoutAmount(e.target.value)}
                inputMode="numeric"
                placeholder="10000"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={available < 1000}
                onClick={() => setCashoutAmount(String(available))}
                className="shrink-0 rounded-lg border border-cyan-300 px-2 text-xs text-cyan-800 disabled:opacity-40"
              >
                Max
              </button>
            </div>
          </label>
          <label className="block text-xs text-slate-600 sm:col-span-2">
            Note (optional)
            <input
              value={cashoutNote}
              onChange={(e) => setCashoutNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || available < 1000 || !payoutPhone.trim()}
            onClick={() => void requestCashout()}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Requesting…" : "Request cashout"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createTestCharge()}
            className="rounded-lg border border-cyan-300 px-3 py-2 text-sm text-cyan-900"
          >
            Create test charge (5,000 UGX)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendFeeReminders()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
          >
            Send Telegram fee reminders
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
          >
            Refresh
          </button>
        </div>
        {available < 1000 ? (
          <p className="mt-3 text-xs text-amber-800">
            Balance below 1,000 UGX minimum. Create charges via Partner API or{" "}
            <Link href="/opgb" className="underline">
              /opgb
            </Link>{" "}
            ; confirmed payments credit this float.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Cashout history</h2>
        <ul className="mt-3 space-y-2">
          {payouts.length === 0 ? (
            <li className="text-sm text-slate-500">No cashout requests yet.</li>
          ) : (
            payouts.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <span className="font-medium">{formatUgx(p.amountUgx)}</span>
                <span className="text-xs text-slate-500">
                  {p.network} {p.phone}
                </span>
                <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase text-slate-600">{p.status}</span>
                <span className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleString()}</span>
                {p.rejectionReason ? (
                  <span className="w-full text-xs text-rose-600">Rejected: {p.rejectionReason}</span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Merchant charges</h2>
          <Link href="/opgb#charges" className="text-xs text-cyan-800 underline">
            How to create a charge
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-700">
            <thead className="border-b text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-2 py-2">Created</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Order</th>
                <th className="px-2 py-2">Customer paid</th>
                <th className="px-2 py-2">OPGB fee</th>
                <th className="px-2 py-2">School net</th>
                <th className="px-2 py-2">Ref</th>
              </tr>
            </thead>
            <tbody>
              {charges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-slate-500">
                    No merchant charges yet. Use Partner API keys from the Developers dashboard once linked.
                  </td>
                </tr>
              ) : (
                charges.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50">
                    <td className="px-2 py-2 whitespace-nowrap">{new Date(c.createdAt).toLocaleString()}</td>
                    <td className="px-2 py-2">{c.status}</td>
                    <td className="px-2 py-2">{formatUgx(c.orderAmountUgx || c.amountUgx)}</td>
                    <td className="px-2 py-2">{formatUgx(c.amountUgx)}</td>
                    <td className="px-2 py-2">{formatUgx(c.platformFeeUgx || 0)}</td>
                    <td className="px-2 py-2">{formatUgx(c.merchantNetUgx || 0)}</td>
                    <td className="px-2 py-2 font-mono text-[10px]">{c.externalRef || c.description || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Ops queue:{" "}
        <Link href="/admin/master/opgb-ops" className="text-cyan-800 underline">
          Master OPGB console
        </Link>
        . Developers twin:{" "}
        <Link href="/developers/dashboard#settlement" className="text-cyan-800 underline">
          /developers/dashboard#settlement
        </Link>
        .
      </p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

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

const inputClass =
  "mt-1 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-300";

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
    return <p className="text-sm text-slate-300">Loading OpenPayGB settlement…</p>;
  }

  const available = settlement?.availableBalanceUgx ?? app?.settlementBalanceUgx ?? 0;

  return (
    <div className="space-y-6 text-slate-100">
      <header className="rounded-2xl border border-cyan-500/35 bg-cyan-950/40 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-cyan-300">OpenPayGB · School merchant</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Settlement & cashout</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          Confirmed merchant charges (hosted checkout / Partner API) credit this school&apos;s OpenPayGB settlement
          float. Cash out to MoMo when you want funds sent to the school float number. This is separate from tuition
          Cashbook / Outflow vouchers.
        </p>
        {app ? (
          <p className="mt-3 break-all font-mono text-xs text-cyan-100/90">
            Merchant app: <span className="text-white">{app.brandingName || app.name}</span>
            <span className="text-slate-500"> · </span>
            client_id <span className="text-white">{app.clientId}</span>
          </p>
        ) : null}
        {provisioned ? (
          <p className="mt-2 text-xs font-medium text-emerald-300">
            Merchant wallet was provisioned automatically for this school.
          </p>
        ) : null}
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Available" value={formatUgx(available)} accent="cyan" />
        <Kpi label="Pending cashouts" value={formatUgx(settlement?.pendingPayoutUgx ?? 0)} />
        <Kpi label="Paid out" value={formatUgx(settlement?.totalPaidOutUgx ?? 0)} />
        <Kpi label="Lifetime net" value={formatUgx(settlement?.lifetimeMerchantNetUgx ?? 0)} accent="emerald" />
      </section>

      <section className="rounded-2xl border border-white/15 bg-[#0a101f] p-5">
        <h2 className="text-lg font-semibold text-white">Cashout destination</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            MoMo phone
            <input
              value={payoutPhone}
              onChange={(e) => setPayoutPhone(e.target.value)}
              placeholder="07… or 2567…"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Network
            <select
              value={payoutNetwork}
              onChange={(e) => setPayoutNetwork(e.target.value as "MTN" | "AIRTEL")}
              className={inputClass}
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
          className="mt-3 rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
        >
          Save destination
        </button>
      </section>

      <section className="rounded-2xl border border-cyan-500/30 bg-cyan-950/25 p-5">
        <h2 className="text-lg font-semibold text-cyan-50">Request cashout</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className={labelClass}>
            Amount (UGX)
            <div className="mt-1 flex gap-2">
              <input
                value={cashoutAmount}
                onChange={(e) => setCashoutAmount(e.target.value)}
                inputMode="numeric"
                placeholder="10000"
                className={inputClass}
              />
              <button
                type="button"
                disabled={available < 1000}
                onClick={() => setCashoutAmount(String(available))}
                className="shrink-0 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2 text-xs font-semibold text-cyan-100 disabled:opacity-40"
              >
                Max
              </button>
            </div>
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Note (optional)
            <input
              value={cashoutNote}
              onChange={(e) => setCashoutNote(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || available < 1000 || !payoutPhone.trim()}
            onClick={() => void requestCashout()}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {busy ? "Requesting…" : "Request cashout"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createTestCharge()}
            className="rounded-lg border border-cyan-400/40 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/10"
          >
            Create test charge (5,000 UGX)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendFeeReminders()}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            Send Telegram fee reminders
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            Refresh
          </button>
        </div>
        {available < 1000 ? (
          <p className="mt-3 text-xs leading-relaxed text-amber-200">
            Balance below 1,000 UGX minimum. Create charges via Partner API or{" "}
            <Link href="/opgb" className="font-semibold text-cyan-300 underline">
              /opgb
            </Link>{" "}
            ; confirmed payments credit this float.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/15 bg-[#0a101f] p-5">
        <h2 className="text-lg font-semibold text-white">Cashout history</h2>
        <ul className="mt-3 space-y-2">
          {payouts.length === 0 ? (
            <li className="text-sm text-slate-400">No cashout requests yet.</li>
          ) : (
            payouts.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm"
              >
                <span className="font-semibold text-white">{formatUgx(p.amountUgx)}</span>
                <span className="text-xs text-slate-300">
                  {p.network} {p.phone}
                </span>
                <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
                  {p.status}
                </span>
                <span className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleString()}</span>
                {p.rejectionReason ? (
                  <span className="w-full text-xs text-rose-300">Rejected: {p.rejectionReason}</span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/15 bg-[#0a101f] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Merchant charges</h2>
          <Link href="/opgb#charges" className="text-xs font-medium text-cyan-300 underline">
            How to create a charge
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="border-b border-white/15 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-2 py-2.5 font-semibold">Created</th>
                <th className="px-2 py-2.5 font-semibold">Status</th>
                <th className="px-2 py-2.5 font-semibold">Order</th>
                <th className="px-2 py-2.5 font-semibold">Customer paid</th>
                <th className="px-2 py-2.5 font-semibold">OPGB fee</th>
                <th className="px-2 py-2.5 font-semibold">School net</th>
                <th className="px-2 py-2.5 font-semibold">Ref</th>
              </tr>
            </thead>
            <tbody>
              {charges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-slate-400">
                    No merchant charges yet. Use Partner API keys from the Developers dashboard once linked.
                  </td>
                </tr>
              ) : (
                charges.map((c) => (
                  <tr key={c.id} className="border-b border-white/10">
                    <td className="px-2 py-2.5 whitespace-nowrap text-slate-300">
                      {new Date(c.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2.5 font-medium text-white">{c.status}</td>
                    <td className="px-2 py-2.5 text-white">{formatUgx(c.orderAmountUgx || c.amountUgx)}</td>
                    <td className="px-2 py-2.5 text-white">{formatUgx(c.amountUgx)}</td>
                    <td className="px-2 py-2.5 text-slate-300">{formatUgx(c.platformFeeUgx || 0)}</td>
                    <td className="px-2 py-2.5 font-semibold text-emerald-300">
                      {formatUgx(c.merchantNetUgx || 0)}
                    </td>
                    <td className="px-2 py-2.5 font-mono text-xs text-slate-300">
                      {c.externalRef || c.description || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Ops queue:{" "}
        <Link href="/admin/master/opgb-ops" className="font-medium text-cyan-300 underline">
          Master OPGB console
        </Link>
        . Developers twin:{" "}
        <Link href="/developers/dashboard#settlement" className="font-medium text-cyan-300 underline">
          /developers/dashboard#settlement
        </Link>
        .
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "cyan" | "emerald";
}) {
  const border =
    accent === "cyan"
      ? "border-cyan-500/35 bg-cyan-950/30"
      : accent === "emerald"
        ? "border-emerald-500/35 bg-emerald-950/30"
        : "border-white/15 bg-[#0a101f]";
  const valueColor =
    accent === "cyan" ? "text-cyan-100" : accent === "emerald" ? "text-emerald-200" : "text-white";
  return (
    <div className={`rounded-xl border p-4 ${border}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";

type Charge = {
  id: string;
  orderAmountUgx?: number;
  amountUgx: number;
  platformFeeUgx?: number;
  merchantFeeUgx?: number;
  currency: string;
  description: string;
  status: string;
  redirectUrl: string;
  cancelUrl: string;
  expiresAt: string;
};

type Merchant = {
  name: string;
  logoUrl: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  whiteLabelMode?: boolean;
  supportEmail?: string | null;
  supportUrl?: string | null;
};

function formatUgx(n: number): string {
  return `UGX ${n.toLocaleString("en-UG")}`;
}

function safeHex(v: string | null | undefined, fallback: string): string {
  if (!v) return fallback;
  const t = v.trim();
  return /^#[0-9A-Fa-f]{3,8}$/.test(t) ? t : fallback;
}

export function MerchantCheckoutClient({ chargeId }: { chargeId: string }) {
  const [charge, setCharge] = useState<Charge | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [sandbox, setSandbox] = useState(false);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState<"MTN" | "AIRTEL">("MTN");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/public/charges/${chargeId}`, { cache: "no-store" });
    const j = (await r.json()) as {
      charge?: Charge;
      merchant?: Merchant;
      sandbox?: boolean;
      error?: string;
    };
    if (!r.ok) {
      setError(j.error ?? "Charge not found");
      return;
    }
    setCharge(j.charge ?? null);
    setMerchant(j.merchant ?? null);
    setSandbox(Boolean(j.sandbox));
    setError(null);

    if (j.charge?.status === "confirmed" && j.charge.redirectUrl) {
      const u = new URL(j.charge.redirectUrl);
      u.searchParams.set("chargeId", j.charge.id);
      u.searchParams.set("status", "confirmed");
      window.location.href = u.toString();
    }
  }, [chargeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!charge || charge.status === "confirmed" || charge.status === "expired") return;
    if (charge.status !== "collecting" && charge.status !== "pending") return;
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [charge, load]);

  const theme = useMemo(() => {
    const primary = safeHex(merchant?.primaryColor, "#8b5cf6");
    const accent = safeHex(merchant?.accentColor, "#14b8a6");
    return { primary, accent };
  }, [merchant?.primaryColor, merchant?.accentColor]);

  async function startPay() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const r = await fetch(`/api/public/charges/${chargeId}/livepay-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, network }),
      });
      const j = (await r.json()) as { message?: string; sandbox?: boolean; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not start payment");
      setMessage(j.message ?? "Approve the prompt on your phone.");
      if (j.sandbox) setSandbox(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment start failed");
    } finally {
      setBusy(false);
    }
  }

  async function sandboxConfirm() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/public/charges/${chargeId}/sandbox-confirm`, { method: "POST" });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Sandbox confirm failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !charge) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-rose-500/30 bg-rose-950/30 p-6 text-center">
        <p className="text-sm text-rose-200">{error}</p>
        <Link href="/opgb" className="mt-4 inline-block text-sm text-cyan-300 hover:underline">
          Back to {OPEN_PAY_BRAND}
        </Link>
      </div>
    );
  }

  if (!charge) {
    return <p className="text-center text-sm text-slate-400">Loading checkout…</p>;
  }

  const payable = charge.status === "pending" || charge.status === "collecting";
  const whiteLabel = Boolean(merchant?.whiteLabelMode);
  const order = charge.orderAmountUgx && charge.orderAmountUgx > 0 ? charge.orderAmountUgx : charge.amountUgx;
  const hasFeeSplit =
    (charge.platformFeeUgx ?? 0) > 0 ||
    (charge.merchantFeeUgx ?? 0) > 0 ||
    order !== charge.amountUgx;

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      {!whiteLabel ? (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <Link href="/opgb" className="font-semibold text-violet-200 hover:text-white">
            {OPEN_PAY_BRAND}
          </Link>
          <span className="uppercase tracking-wider">Secure checkout</span>
        </div>
      ) : null}

      <div
        className="rounded-2xl border p-6 shadow-xl"
        style={{
          borderColor: `${theme.primary}55`,
          background: `linear-gradient(145deg, ${theme.primary}33 0%, #0a101f 55%)`,
        }}
      >
        <div className="flex items-start gap-3">
          {merchant?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={merchant.logoUrl}
              alt=""
              className="h-12 w-12 rounded-xl border border-white/10 object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p
              className="text-[0.65rem] font-bold uppercase tracking-[0.2em]"
              style={{ color: `${theme.primary}cc` }}
            >
              {whiteLabel ? "Checkout" : `${OPEN_PAY_BRAND} Checkout`}
            </p>
            <h1 className="mt-2 text-xl font-semibold text-white">{merchant?.name ?? "Merchant"}</h1>
          </div>
        </div>
        {charge.description ? <p className="mt-3 text-sm text-slate-400">{charge.description}</p> : null}
        <p className="mt-4 text-3xl font-semibold text-white">{formatUgx(charge.amountUgx)}</p>
        {hasFeeSplit ? (
          <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
            <li>Order {formatUgx(order)}</li>
            {(charge.merchantFeeUgx ?? 0) > 0 ? (
              <li>Merchant fee {formatUgx(charge.merchantFeeUgx ?? 0)}</li>
            ) : null}
            {(charge.platformFeeUgx ?? 0) > 0 &&
            order + (charge.merchantFeeUgx ?? 0) + (charge.platformFeeUgx ?? 0) === charge.amountUgx ? (
              <li>
                {OPEN_PAY_BRAND} fee {formatUgx(charge.platformFeeUgx ?? 0)}
              </li>
            ) : null}
          </ul>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">
          Status: <span className="text-slate-300">{charge.status}</span>
          {" · "}Expires {new Date(charge.expiresAt).toLocaleString()}
        </p>
      </div>

      {charge.status === "confirmed" ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-200">
          Payment confirmed. Redirecting…
        </div>
      ) : null}

      {payable ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0a101f] p-5">
          <label className="block text-sm text-slate-300">
            Mobile Money number
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="2567…"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Network
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as "MTN" | "AIRTEL")}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
            >
              <option value="MTN">MTN</option>
              <option value="AIRTEL">Airtel</option>
            </select>
          </label>
          <button
            type="button"
            disabled={busy || phone.trim().length < 9}
            onClick={() => void startPay()}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
            style={{
              background: `linear-gradient(90deg, ${theme.accent}, ${theme.primary})`,
            }}
          >
            {busy ? "Starting…" : "Pay with Mobile Money"}
          </button>
          {sandbox ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void sandboxConfirm()}
              className="w-full rounded-xl border border-amber-400/40 bg-amber-950/40 px-4 py-3 text-sm font-semibold text-amber-100"
            >
              Sandbox: mark as paid
            </button>
          ) : null}
          {message ? <p className="text-sm text-cyan-200">{message}</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
      ) : null}

      {merchant?.supportEmail || merchant?.supportUrl ? (
        <p className="text-center text-xs text-slate-500">
          Support:{" "}
          {merchant.supportUrl ? (
            <a href={merchant.supportUrl} className="text-slate-300 hover:underline">
              {merchant.supportUrl.replace(/^https?:\/\//, "")}
            </a>
          ) : (
            <a href={`mailto:${merchant.supportEmail}`} className="text-slate-300 hover:underline">
              {merchant.supportEmail}
            </a>
          )}
        </p>
      ) : null}

      {charge.cancelUrl ? (
        <a href={charge.cancelUrl} className="block text-center text-sm text-slate-500 hover:text-slate-300">
          Cancel and return
        </a>
      ) : !whiteLabel ? (
        <Link href="/opgb" className="block text-center text-sm text-slate-500 hover:text-slate-300">
          Back to {OPEN_PAY_BRAND}
        </Link>
      ) : null}

      <p className="text-center text-[10px] text-slate-600">
        {whiteLabel ? `Secure payments by ${OPEN_PAY_BRAND}` : `Powered by ${OPEN_PAY_BRAND}`}
      </p>
    </div>
  );
}

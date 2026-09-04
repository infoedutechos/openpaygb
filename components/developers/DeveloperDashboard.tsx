"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CopyTextButton } from "@/components/ui/CopyTextButton";

type AppInfo = {
  id: string;
  name: string;
  clientId: string;
  redirectUris: string[];
  brandingName: string;
  brandingLogoUrl?: string;
  brandingPrimaryColor?: string;
  brandingAccentColor?: string;
  whiteLabelMode?: boolean;
  supportEmail?: string;
  supportUrl?: string;
  settlementBalanceUgx?: number;
  platformFeePayer?: string;
  merchantSurchargePercent?: number;
  merchantSurchargeFixedUgx?: number;
  platformFeeOverrideKind?: string;
  platformFeeOverrideUgx?: number;
  platformFeeOverridePercent?: number;
  payoutPhone?: string;
  payoutNetwork?: string;
  scopes: string[];
};

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  enabled: boolean;
};

type WebhookRow = {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
};

type ChargeRow = {
  id: string;
  orderAmountUgx: number;
  amountUgx: number;
  platformFeeUgx: number;
  merchantFeeUgx: number;
  merchantNetUgx: number;
  description: string;
  status: string;
  externalRef: string | null;
  checkoutUrl: string;
  createdAt: string;
  paidAt: string | null;
};

type PayoutRow = {
  id: string;
  amountUgx: number;
  phone: string;
  network: string;
  status: string;
  note: string;
  createdAt: string;
  paidAt: string | null;
  rejectionReason: string | null;
};

type Settlement = {
  availableBalanceUgx: number;
  pendingPayoutUgx: number;
  pendingPayoutCount: number;
  totalPaidOutUgx: number;
  lifetimeCollectedUgx: number;
  lifetimeOrderUgx: number;
  lifetimePlatformFeesUgx: number;
  lifetimeMerchantNetUgx: number;
  confirmedChargeCount: number;
  totalChargeCount: number;
};

type FeeQuote = {
  orderAmountUgx: number;
  platformFeeUgx: number;
  whiteLabelFeeUgx?: number;
  merchantFeeUgx: number;
  customerTotalUgx: number;
  merchantNetUgx: number;
  platformFeePayer: string;
  whiteLabelMode?: boolean;
  notes: string[];
};

type WhiteLabelPricing = {
  whiteLabelFeeKind: string;
  whiteLabelFeeUgx: number;
  whiteLabelFeePercent: number;
  whiteLabelActivationFeeUgx: number;
};

function formatUgx(n: number): string {
  return `UGX ${n.toLocaleString("en-UG")}`;
}

export function DeveloperDashboard() {
  const [app, setApp] = useState<AppInfo | null>(null);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [scopes, setScopes] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [feeQuote, setFeeQuote] = useState<FeeQuote | null>(null);
  const [whiteLabelPricing, setWhiteLabelPricing] = useState<WhiteLabelPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [keyName, setKeyName] = useState("Production key");
  const [keyScopes, setKeyScopes] = useState<string[]>([
    "charges:create",
    "charges:read",
    "payouts:create",
    "payouts:read",
    "payments:read",
  ]);
  const [whName, setWhName] = useState("Payment events");
  const [whUrl, setWhUrl] = useState("");
  const [whEvents, setWhEvents] = useState<string[]>(["charge.confirmed", "charge.failed", "payment.confirmed"]);

  const [cashoutAmount, setCashoutAmount] = useState("");
  const [cashoutNote, setCashoutNote] = useState("");

  const [feePayer, setFeePayer] = useState<"pass_through" | "absorb">("pass_through");
  const [surchargePct, setSurchargePct] = useState("0");
  const [surchargeFixed, setSurchargeFixed] = useState("0");
  const [feeOverrideKind, setFeeOverrideKind] = useState("inherit");
  const [feeOverrideUgx, setFeeOverrideUgx] = useState("0");
  const [feeOverridePct, setFeeOverridePct] = useState("0");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutNetwork, setPayoutNetwork] = useState<"MTN" | "AIRTEL" | "">("MTN");

  const [brandingName, setBrandingName] = useState("");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState("");
  const [brandingPrimary, setBrandingPrimary] = useState("#8b5cf6");
  const [brandingAccent, setBrandingAccent] = useState("#14b8a6");
  const [whiteLabelMode, setWhiteLabelMode] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportUrl, setSupportUrl] = useState("");

  const applySettingsToForm = useCallback((a: AppInfo, quote?: FeeQuote | null, sum?: Settlement | null) => {
    setFeePayer((a.platformFeePayer as "pass_through" | "absorb") || "pass_through");
    setSurchargePct(String(a.merchantSurchargePercent ?? 0));
    setSurchargeFixed(String(a.merchantSurchargeFixedUgx ?? 0));
    setFeeOverrideKind(a.platformFeeOverrideKind ?? "inherit");
    setFeeOverrideUgx(String(a.platformFeeOverrideUgx ?? 0));
    setFeeOverridePct(String(a.platformFeeOverridePercent ?? 0));
    setPayoutPhone(a.payoutPhone ?? "");
    setPayoutNetwork((a.payoutNetwork as "MTN" | "AIRTEL" | "") || "MTN");
    setBrandingName(a.brandingName || a.name);
    setBrandingLogoUrl(a.brandingLogoUrl ?? "");
    setBrandingPrimary(a.brandingPrimaryColor || "#8b5cf6");
    setBrandingAccent(a.brandingAccentColor || "#14b8a6");
    setWhiteLabelMode(Boolean(a.whiteLabelMode));
    setSupportEmail(a.supportEmail ?? "");
    setSupportUrl(a.supportUrl ?? "");
    if (quote) setFeeQuote(quote);
    if (sum) setSettlement(sum);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, keysRes, whRes, txRes, payRes, settingsRes] = await Promise.all([
        fetch("/api/developers/me", { cache: "no-store" }),
        fetch("/api/developers/keys", { cache: "no-store" }),
        fetch("/api/developers/webhooks", { cache: "no-store" }),
        fetch("/api/developers/transactions?limit=50", { cache: "no-store" }),
        fetch("/api/developers/payouts?limit=30", { cache: "no-store" }),
        fetch("/api/developers/merchant-settings", { cache: "no-store" }),
      ]);
      if (meRes.status === 401) {
        setApp(null);
        setLoading(false);
        return;
      }
      if (!meRes.ok) throw new Error("Could not load app");
      const me = (await meRes.json()) as { app: AppInfo };
      setApp(me.app);
      if (keysRes.ok) {
        const kd = (await keysRes.json()) as { keys: ApiKeyRow[]; availableScopes: string[] };
        setKeys(kd.keys ?? []);
        setScopes(kd.availableScopes ?? []);
      }
      if (whRes.ok) {
        const wd = (await whRes.json()) as { endpoints: WebhookRow[]; availableEvents: string[] };
        setWebhooks(wd.endpoints ?? []);
        setEvents(wd.availableEvents ?? []);
      }
      if (txRes.ok) {
        const td = (await txRes.json()) as { charges: ChargeRow[]; summary: Settlement };
        setCharges(td.charges ?? []);
        if (td.summary) setSettlement(td.summary);
      }
      if (payRes.ok) {
        const pd = (await payRes.json()) as { payouts: PayoutRow[]; summary: Settlement };
        setPayouts(pd.payouts ?? []);
        if (pd.summary) setSettlement(pd.summary);
      }
      if (settingsRes.ok) {
        const sd = (await settingsRes.json()) as {
          app: AppInfo;
          settlement: Settlement;
          sampleFeeQuote: FeeQuote;
          whiteLabelPricing?: WhiteLabelPricing;
        };
        setApp(sd.app);
        applySettingsToForm(sd.app, sd.sampleFeeQuote, sd.settlement);
        if (sd.whiteLabelPricing) setWhiteLabelPricing(sd.whiteLabelPricing);
      } else {
        applySettingsToForm(me.app);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [applySettingsToForm]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Deep links like #settlement fail while the page is still "Loading…" — scroll after content mounts. */
  useEffect(() => {
    if (loading || !app) return;

    const scrollToHash = () => {
      const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      if (!hash) return;
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const t = window.setTimeout(scrollToHash, 50);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [loading, app]);

  async function createKey() {
    setMessage(null);
    setNewKeyPlain(null);
    const res = await fetch("/api/developers/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName, scopes: keyScopes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Key creation failed");
      return;
    }
    setNewKeyPlain(typeof data.apiKey === "string" ? data.apiKey : null);
    setMessage("API key created — copy it now.");
    void load();
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.getElementById("api-keys")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  async function createWebhook() {
    setMessage(null);
    setNewWebhookSecret(null);
    const res = await fetch("/api/developers/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: whName, url: whUrl, events: whEvents }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Webhook creation failed");
      return;
    }
    setNewWebhookSecret(typeof data.signingSecret === "string" ? data.signingSecret : null);
    setMessage("Webhook endpoint created.");
    void load();
  }

  async function saveFeesAndPayout() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/developers/merchant-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformFeePayer: feePayer,
          merchantSurchargePercent: Number(surchargePct) || 0,
          merchantSurchargeFixedUgx: Math.round(Number(surchargeFixed) || 0),
          platformFeeOverrideKind: feeOverrideKind,
          platformFeeOverrideUgx: Math.round(Number(feeOverrideUgx) || 0),
          platformFeeOverridePercent: Number(feeOverridePct) || 0,
          payoutPhone,
          payoutNetwork: payoutNetwork || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      setApp(data.app);
      setFeeQuote(data.sampleFeeQuote ?? null);
      setSettlement(data.settlement ?? null);
      setMessage("Fee and payout settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveBranding() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/developers/merchant-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandingName,
          brandingLogoUrl,
          brandingPrimaryColor: brandingPrimary,
          brandingAccentColor: brandingAccent,
          whiteLabelMode,
          supportEmail,
          supportUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      setApp(data.app);
      setMessage("White-label branding saved. New checkouts will use these colors.");
      if (data.whiteLabelActivation?.activationFeeUgx) {
        setMessage(
          `White-label activated. Activation fee ${formatUgx(data.whiteLabelActivation.activationFeeUgx)} debited from settlement.`,
        );
      }
      if (data.settlement) setSettlement(data.settlement);
      if (data.sampleFeeQuote) setFeeQuote(data.sampleFeeQuote);
      if (data.whiteLabelPricing) setWhiteLabelPricing(data.whiteLabelPricing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function requestCashout() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const amountUgx = Math.round(Number(String(cashoutAmount).replace(/,/g, "")));
      if (!Number.isFinite(amountUgx) || amountUgx < 1000) {
        throw new Error("Minimum cashout is 1,000 UGX");
      }
      const available = settlement?.availableBalanceUgx ?? app?.settlementBalanceUgx ?? 0;
      if (amountUgx > available) {
        throw new Error(`Insufficient balance (${available.toLocaleString()} UGX available)`);
      }
      const phone = payoutPhone.trim();
      if (!phone) {
        throw new Error("Set a payout Mobile Money number first");
      }
      const network = payoutNetwork === "AIRTEL" ? "AIRTEL" : "MTN";
      const res = await fetch("/api/developers/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUgx,
          note: cashoutNote || undefined,
          phone,
          network,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Cashout failed");
      setCashoutAmount("");
      setCashoutNote("");
      if (data.summary) setSettlement(data.summary as Settlement);
      if (data.payout) setPayouts((prev) => [data.payout as PayoutRow, ...prev]);
      setApp((prev) =>
        prev
          ? {
              ...prev,
              payoutPhone: phone,
              payoutNetwork: network,
              settlementBalanceUgx:
                (data.summary as Settlement | undefined)?.availableBalanceUgx ??
                Math.max(0, (prev.settlementBalanceUgx ?? 0) - amountUgx),
            }
          : prev,
      );
      setMessage(`Cashout of ${formatUgx(amountUgx)} queued. Ops will send MoMo and mark it paid.`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cashout failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/developers/auth/logout", { method: "POST" });
    window.location.href = "/developers";
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading developer dashboard…</p>;
  }

  if (!app) {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const next = encodeURIComponent(`/developers/dashboard${hash}`);
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6">
        <h1 className="text-xl font-semibold text-white">Developer session required</h1>
        <p className="mt-2 text-sm text-slate-400">
          This dashboard needs a <strong className="text-slate-200">developer app</strong> sign-in. Master Admin,
          school admin, or student login does not open the Partner API dashboard.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Use the left sidebar (desktop) or top <strong className="text-emerald-300">Menu</strong> (mobile) anytime —
          it stays available even before you sign in.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/developers/register?next=${next}`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Sign in / register app
          </Link>
          <Link
            href="/developers"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            Developer hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header id="overview" className="scroll-mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Developer app</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">{app.brandingName || app.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="font-mono text-xs text-slate-400">client_id: {app.clientId}</p>
          <CopyTextButton
            text={app.clientId}
            label="Copy client_id"
            className="rounded-md border border-white/15 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-white/10"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">Scopes: {app.scopes.join(", ")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-violet-500/25 bg-violet-950/30 p-4">
            <p className="text-[10px] uppercase tracking-wider text-violet-300">Available to cash out</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {formatUgx(settlement?.availableBalanceUgx ?? app.settlementBalanceUgx ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Confirmed charges</p>
            <p className="mt-1 text-xl font-semibold text-white">{settlement?.confirmedChargeCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">OPGB fees collected</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {formatUgx(settlement?.lifetimePlatformFeesUgx ?? 0)}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-violet-500/25 bg-violet-950/30 p-4 text-sm text-slate-300">
          <p className="font-semibold text-violet-100">OpenPayGB payment provider</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Create merchant charges with <code className="text-violet-200">POST /api/partner/v1/charges</code>, send
            payers to <code className="text-cyan-200">checkoutUrl</code>, cash out settled balance, and brand hosted
            checkout. Overview:{" "}
            <Link href="/opgb" className="text-violet-300 hover:underline">
              /opgb
            </Link>
            .
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="#settlement" className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400/40">
            Cash out
          </a>
          <a href="#transactions" className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400/40">
            Transactions
          </a>
          <a href="#api-keys" className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:border-emerald-400/60">
            Partner API keys
          </a>
          <a href="#webhooks" className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400/40">
            Webhooks
          </a>
          <Link href="/opgb#integrate" className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400/40">
            Integration guide
          </Link>
          <button type="button" onClick={() => void logout()} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-400 hover:text-white">
            Sign out
          </button>
        </div>
      </header>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-200">{message}</p> : null}
      {newKeyPlain ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-950/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-amber-200">New API key (shown once)</p>
            <CopyTextButton text={newKeyPlain} label="Copy API key" />
          </div>
          <code className="mt-2 block break-all text-xs text-white">{newKeyPlain}</code>
        </div>
      ) : null}
      {newWebhookSecret ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-950/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-amber-200">Webhook signing secret</p>
            <CopyTextButton text={newWebhookSecret} label="Copy secret" />
          </div>
          <code className="mt-2 block break-all text-xs text-white">{newWebhookSecret}</code>
        </div>
      ) : null}

      <section id="settlement" className="scroll-mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-950/15 p-6">
        <h2 className="text-lg font-semibold text-cyan-100">Settlement & cashout</h2>
        <p className="mt-1 text-sm text-slate-400">
          Confirmed charges credit your settlement balance (merchant net after OPGB fee rules). Request a Mobile Money
          cashout when you want funds sent to your float number — that is how merchants realize revenue while OPGB
          retains the platform fee.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-lg border border-white/10 p-3">
            <p className="text-[10px] uppercase text-slate-500">Available</p>
            <p className="font-semibold text-white">
              {formatUgx(settlement?.availableBalanceUgx ?? app.settlementBalanceUgx ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <p className="text-[10px] uppercase text-slate-500">Pending cashouts</p>
            <p className="font-semibold text-white">{formatUgx(settlement?.pendingPayoutUgx ?? 0)}</p>
            {(settlement?.pendingPayoutCount ?? 0) > 0 ? (
              <p className="mt-0.5 text-[10px] text-amber-300/90">{settlement?.pendingPayoutCount} request(s)</p>
            ) : null}
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <p className="text-[10px] uppercase text-slate-500">Paid out</p>
            <p className="font-semibold text-white">{formatUgx(settlement?.totalPaidOutUgx ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <p className="text-[10px] uppercase text-slate-500">Your lifetime net</p>
            <p className="font-semibold text-white">{formatUgx(settlement?.lifetimeMerchantNetUgx ?? 0)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Cashout MoMo phone
            <input
              value={payoutPhone}
              onChange={(e) => setPayoutPhone(e.target.value)}
              placeholder="07… or 2567…"
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Network
            <select
              value={payoutNetwork || "MTN"}
              onChange={(e) => setPayoutNetwork(e.target.value as "MTN" | "AIRTEL" | "")}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="MTN">MTN</option>
              <option value="AIRTEL">Airtel</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs text-slate-400">
            Amount (UGX)
            <div className="mt-1 flex gap-2">
              <input
                value={cashoutAmount}
                onChange={(e) => setCashoutAmount(e.target.value)}
                placeholder="10000"
                inputMode="numeric"
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                disabled={(settlement?.availableBalanceUgx ?? 0) < 1000}
                onClick={() =>
                  setCashoutAmount(String(settlement?.availableBalanceUgx ?? app.settlementBalanceUgx ?? 0))
                }
                className="shrink-0 rounded-lg border border-cyan-400/30 px-2.5 text-[11px] text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-40"
              >
                Max
              </button>
            </div>
          </label>
          <label className="block text-xs text-slate-400 sm:col-span-2">
            Note (optional)
            <input
              value={cashoutNote}
              onChange={(e) => setCashoutNote(e.target.value)}
              placeholder="Invoice # / reason"
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>

        {(settlement?.availableBalanceUgx ?? app.settlementBalanceUgx ?? 0) < 1000 ? (
          <p className="mt-3 text-xs text-amber-200/90">
            Available balance is below the 1,000 UGX minimum. Confirmed merchant charges will credit this balance
            automatically.
          </p>
        ) : null}

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={
              busy ||
              (settlement?.availableBalanceUgx ?? app.settlementBalanceUgx ?? 0) < 1000 ||
              !payoutPhone.trim()
            }
            onClick={() => void requestCashout()}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-teal-600 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {busy ? "Requesting…" : "Request cashout"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
          >
            Refresh
          </button>
          {!payoutPhone.trim() ? (
            <span className="text-xs text-rose-300">Enter a MoMo number to enable cashout.</span>
          ) : null}
        </div>

        <ul className="mt-6 space-y-2">
          {payouts.length === 0 ? (
            <li className="text-sm text-slate-500">No cashout requests yet.</li>
          ) : (
            payouts.map((p) => {
              const statusClass =
                p.status === "paid"
                  ? "border-emerald-400/30 text-emerald-200"
                  : p.status === "rejected"
                    ? "border-rose-400/30 text-rose-200"
                    : p.status === "cancelled"
                      ? "border-slate-500/40 text-slate-400"
                      : "border-amber-400/30 text-amber-100";
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-white">{formatUgx(p.amountUgx)}</span>
                  <span className="text-xs text-slate-400">
                    {p.network} {p.phone}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusClass}`}>
                    {p.status}
                  </span>
                  <span className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleString()}</span>
                  {p.rejectionReason ? (
                    <span className="w-full text-xs text-rose-300/90">Rejected: {p.rejectionReason}</span>
                  ) : null}
                  {p.note ? <span className="w-full text-[11px] text-slate-500">Note: {p.note}</span> : null}
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section id="transactions" className="scroll-mt-6 rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Transactions</h2>
        <p className="mt-1 text-sm text-slate-400">Merchant charges created via Partner API for this app.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-2 py-2">Created</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Order</th>
                <th className="px-2 py-2">Customer paid</th>
                <th className="px-2 py-2">OPGB fee</th>
                <th className="px-2 py-2">Your net</th>
                <th className="px-2 py-2">Ref</th>
                <th className="px-2 py-2">Checkout</th>
              </tr>
            </thead>
            <tbody>
              {charges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-slate-500">
                    No charges yet. Create one with POST /api/partner/v1/charges.
                  </td>
                </tr>
              ) : (
                charges.map((c) => (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="px-2 py-2 whitespace-nowrap">{new Date(c.createdAt).toLocaleString()}</td>
                    <td className="px-2 py-2">{c.status}</td>
                    <td className="px-2 py-2">{formatUgx(c.orderAmountUgx || c.amountUgx)}</td>
                    <td className="px-2 py-2">{formatUgx(c.amountUgx)}</td>
                    <td className="px-2 py-2">{formatUgx(c.platformFeeUgx || 0)}</td>
                    <td className="px-2 py-2">{formatUgx(c.merchantNetUgx || 0)}</td>
                    <td className="px-2 py-2 font-mono text-[10px]">{c.externalRef || c.description || "—"}</td>
                    <td className="px-2 py-2">
                      <CopyTextButton
                        text={c.checkoutUrl}
                        label="Copy"
                        className="rounded border border-white/15 px-2 py-0.5 text-[10px] hover:bg-white/10"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="fees" className="scroll-mt-6 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-6">
        <h2 className="text-lg font-semibold text-amber-100">Who sets fees</h2>
        <p className="mt-1 text-sm text-slate-400">
          <strong className="text-slate-200">OpenPayGB</strong> sets the platform fee (default 2.5%, min 500 UGX,
          configurable per app). <strong className="text-slate-200">You</strong> choose whether the customer pays that
          fee (pass-through) or you absorb it, and you may add your own surcharge.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Who pays OPGB fee
            <select
              value={feePayer}
              onChange={(e) => setFeePayer(e.target.value as "pass_through" | "absorb")}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="pass_through">Customer pays (pass-through)</option>
              <option value="absorb">Merchant absorbs</option>
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Platform fee override
            <select
              value={feeOverrideKind}
              onChange={(e) => setFeeOverrideKind(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="inherit">Inherit platform default</option>
              <option value="percent">Custom percent</option>
              <option value="fixed_ugx">Fixed UGX</option>
              <option value="none">Waive OPGB fee</option>
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Custom percent
            <input
              value={feeOverridePct}
              onChange={(e) => setFeeOverridePct(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Custom fixed UGX
            <input
              value={feeOverrideUgx}
              onChange={(e) => setFeeOverrideUgx(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Your surcharge %
            <input
              value={surchargePct}
              onChange={(e) => setSurchargePct(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Your surcharge fixed UGX
            <input
              value={surchargeFixed}
              onChange={(e) => setSurchargeFixed(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Cashout MoMo phone
            <input
              value={payoutPhone}
              onChange={(e) => setPayoutPhone(e.target.value)}
              placeholder="2567…"
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Cashout network
            <select
              value={payoutNetwork}
              onChange={(e) => setPayoutNetwork(e.target.value as "MTN" | "AIRTEL" | "")}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="MTN">MTN</option>
              <option value="AIRTEL">Airtel</option>
            </select>
          </label>
        </div>
        {feeQuote ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-4 text-xs text-slate-400">
            <p className="font-semibold text-slate-200">Sample quote on {formatUgx(feeQuote.orderAmountUgx)}</p>
            <ul className="mt-2 space-y-1">
              <li>Customer pays {formatUgx(feeQuote.customerTotalUgx)}</li>
              <li>OPGB fee {formatUgx(feeQuote.platformFeeUgx)}</li>
              <li>Your surcharge {formatUgx(feeQuote.merchantFeeUgx)}</li>
              <li>You receive {formatUgx(feeQuote.merchantNetUgx)}</li>
            </ul>
            {feeQuote.notes?.length ? (
              <p className="mt-2 text-slate-500">{feeQuote.notes.join(" · ")}</p>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveFeesAndPayout()}
          className="mt-4 rounded-lg border border-amber-400/50 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-50"
        >
          Save fee & payout settings
        </button>
      </section>

      <section id="branding" className="scroll-mt-6 rounded-2xl border border-violet-500/25 bg-violet-950/15 p-6">
        <h2 className="text-lg font-semibold text-violet-100">White-label checkout</h2>
        <p className="mt-1 text-sm text-slate-400">
          Brand hosted <code className="text-violet-200">/opgb/checkout/…</code> with your name, logo, and colors.
          White-label mode hides OPGB marketing chrome and keeps a small “Secure payments by OpenPayGB” line.
          OpenPayGB may charge a one-time activation fee and/or an extra per-charge fee while white-label is on.
        </p>
        {whiteLabelPricing ? (
          <div className="mt-3 rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/20 p-3 text-xs text-slate-400">
            <p className="font-semibold text-fuchsia-100">Current white-label pricing</p>
            <ul className="mt-1 space-y-0.5">
              <li>
                Activation:{" "}
                {whiteLabelPricing.whiteLabelActivationFeeUgx > 0
                  ? formatUgx(whiteLabelPricing.whiteLabelActivationFeeUgx)
                  : "Free"}{" "}
                (one-time from settlement)
              </li>
              <li>
                Per charge while enabled:{" "}
                {whiteLabelPricing.whiteLabelFeeKind === "none"
                  ? "No extra fee"
                  : whiteLabelPricing.whiteLabelFeeKind === "fixed_ugx"
                    ? formatUgx(whiteLabelPricing.whiteLabelFeeUgx)
                    : `${whiteLabelPricing.whiteLabelFeePercent}% of order`}
              </li>
            </ul>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Display name
            <input
              value={brandingName}
              onChange={(e) => setBrandingName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Logo URL
            <input
              value={brandingLogoUrl}
              onChange={(e) => setBrandingLogoUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Primary color
            <input
              value={brandingPrimary}
              onChange={(e) => setBrandingPrimary(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Accent color
            <input
              value={brandingAccent}
              onChange={(e) => setBrandingAccent(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Support email
            <input
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Support URL
            <input
              value={supportUrl}
              onChange={(e) => setSupportUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
        <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={whiteLabelMode} onChange={(e) => setWhiteLabelMode(e.target.checked)} />
          Enable white-label mode
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveBranding()}
          className="mt-4 block rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save branding
        </button>
      </section>

      <section id="api-keys" className="scroll-mt-6 rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Partner API keys</h2>
        <p className="mt-1 text-sm text-slate-400">
          Use as <code className="text-emerald-200">Authorization: Bearer odelhub_live_…</code> on Partner APIs.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Key name
            <input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="text-xs text-slate-400">
            Scopes
            <div className="mt-2 flex flex-wrap gap-2">
              {scopes.map((s) => (
                <label key={s} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1">
                  <input
                    type="checkbox"
                    checked={keyScopes.includes(s)}
                    disabled={!app.scopes.includes(s)}
                    onChange={(e) =>
                      setKeyScopes((prev) =>
                        e.target.checked ? [...prev, s] : prev.filter((x) => x !== s),
                      )
                    }
                  />
                  <span className="font-mono text-[10px]">{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void createKey()}
          className="mt-4 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Generate API key
        </button>
        <ul className="mt-6 space-y-2">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm">
              <span className="text-white">{k.name}</span>
              <span className="font-mono text-xs text-slate-500">{k.keyPrefix}…</span>
              <span className="text-xs text-slate-400">{k.scopes.join(", ")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="webhooks" className="scroll-mt-6 rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Webhook endpoints</h2>
        <p className="mt-1 text-sm text-slate-400">Receive payment, charge, and Dex intent events at your HTTPS URL.</p>
        <div className="mt-4 grid gap-3">
          <label className="block text-xs text-slate-400">
            Name
            <input value={whName} onChange={(e) => setWhName(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <label className="block text-xs text-slate-400">
            HTTPS URL
            <input value={whUrl} onChange={(e) => setWhUrl(e.target.value)} placeholder="https://api.example.com/odelhub/webhook" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <div className="flex flex-wrap gap-2 text-xs">
            {events.map((ev) => (
              <label key={ev} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1">
                <input
                  type="checkbox"
                  checked={whEvents.includes(ev)}
                  onChange={(e) =>
                    setWhEvents((prev) => (e.target.checked ? [...prev, ev] : prev.filter((x) => x !== ev)))
                  }
                />
                {ev}
              </label>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => void createWebhook()} className="mt-4 rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100">
          Add webhook endpoint
        </button>
        <ul className="mt-6 space-y-2">
          {webhooks.map((w) => (
            <li key={w.id} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
              <p className="font-medium text-white">{w.name}</p>
              <p className="font-mono text-xs text-slate-500">{w.url}</p>
              <p className="text-xs text-slate-400">{w.events.join(", ")}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="oauth" className="scroll-mt-6 rounded-2xl border border-violet-500/20 bg-violet-950/15 p-6 text-sm text-slate-300">
        <h2 className="text-lg font-semibold text-violet-200">OAuth & OPGB partner APIs</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-slate-400">
          <li>
            Authorize: <code className="text-xs">/api/oauth/authorize?response_type=code&client_id=…</code>
          </li>
          <li>Token: <code className="text-xs">POST /api/oauth/token</code> (client_credentials or authorization_code)</li>
          <li>Merchant charges: <code className="text-xs">POST /api/partner/v1/charges</code></li>
          <li>Payouts / settlement: <code className="text-xs">GET|POST /api/partner/v1/payouts</code></li>
          <li>Dex quote: <code className="text-xs">GET /api/partner/v1/dex/quote</code></li>
          <li>Payment intents: <code className="text-xs">POST /api/partner/v1/dex/payment-intents</code></li>
          <li>OPGB balances: <code className="text-xs">GET /api/partner/v1/opgb/balances?studentId=…</code></li>
        </ul>
        <Link href="/opgb#integrate" className="mt-4 inline-block text-sm text-violet-300 hover:underline">
          Full integration guide on OpenPayGB →
        </Link>
      </section>
    </div>
  );
}

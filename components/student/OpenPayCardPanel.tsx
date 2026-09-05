"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TonConnectButton, useTonWallet } from "@tonconnect/ui-react";
import { useTonPay } from "@ton-pay/ui-react";
import { OPEN_PAY_BRAND, PAYMENT_RAIL_OPENPAY_CARD } from "@/lib/open-pay-brand";
import { clientFetchErrorMessage } from "@/lib/client-fetch-error";
import { readJsonResponse } from "@/utils/read-json-response";
import { fetchJson } from "@/utils/fetch-json";
import { ModalHeader } from "@/components/nav/ModalHeader";

type CardStatus = {
  platform: { enabled: boolean; issueFeeTon: number; issueFeeUgx: number | null };
  card: {
    id: string;
    status: string;
    balanceUgx: number;
    maskedPan: string;
    issuedAt: string | null;
    issueFeeTon: number | null;
    blocked?: boolean;
    validThru?: string;
    holderName?: string;
    holderNameMasked?: string;
    networkLabel?: string;
  } | null;
  holder?: { name: string; email: string };
  hasCard: boolean;
  canPayTuition: boolean;
  holderError?: string;
};

type ActivityItem = {
  id: string;
  kind: string;
  label: string;
  amountUgx: number;
  direction: "in" | "out" | "neutral";
  status: string;
  createdAt: string;
  rail?: string;
};

type SheetId = "topup" | "cashout" | "block" | "settings" | null;
type EstimatorPair = "usd-ugx" | "ton-ugx";

type Props = {
  /** API prefix — student default, or `/api/admin/openpay-card` for org admins. */
  apiBase?: string;
  /** When false, hide tuition-pay hints (admin wallets). */
  showTuitionHint?: boolean;
  /** Master tenant filter (`orgSlug`) — appended to all card API calls. */
  organizationSlug?: string | null;
};

function formatUgx(n: number): string {
  return `UGX ${Math.round(n).toLocaleString()}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
      <path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.4 17.4 0 0 1-3.1 4.2" />
      <path d="M6.1 6.1C4 7.8 2.5 10.1 2 12c0 0 3.5 7 10 7a10.8 10.8 0 0 0 4.3-.9" />
    </svg>
  );
}

function ActionIcon({ kind }: { kind: "topup" | "send" | "block" | "settings" }) {
  const cls = "h-5 w-5";
  if (kind === "topup") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }
  if (kind === "send") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    );
  }
  if (kind === "block") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M7 7l10 10" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
    </svg>
  );
}

export function OpenPayCardPanel({
  apiBase = "/api/student/openpay-card",
  showTuitionHint = true,
  organizationSlug = null,
}: Props) {
  const [data, setData] = useState<CardStatus | null>(null);
  const [wantCard, setWantCard] = useState(false);
  const [fundUgx, setFundUgx] = useState("50000");
  const [fundMode, setFundMode] = useState<"ton" | "momo">("momo");
  const [issueMode, setIssueMode] = useState<"ton" | "momo">("momo");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoNetwork, setMomoNetwork] = useState<"mtn" | "airtel">("mtn");
  const [cashoutUgx, setCashoutUgx] = useState("10000");
  const [cashoutPhone, setCashoutPhone] = useState("");
  const [cashoutNetwork, setCashoutNetwork] = useState<"MTN" | "AIRTEL">("MTN");
  const [livepayEnabled, setLivepayEnabled] = useState(false);
  const [relworxEnabled, setRelworxEnabled] = useState(false);
  const [vixonpayEnabled, setVixonpayEnabled] = useState(false);
  const [momoSandbox, setMomoSandbox] = useState(false);
  const [momoPreferredRail, setMomoPreferredRail] = useState<string | null>(null);
  const [momoNote, setMomoNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [ugxPerUsd, setUgxPerUsd] = useState<number | null>(null);
  const [ugxPerTon, setUgxPerTon] = useState<number | null>(null);
  const [estimatorPair, setEstimatorPair] = useState<EstimatorPair>("usd-ugx");
  const [estimatorFlipped, setEstimatorFlipped] = useState(false);
  const [estLeft, setEstLeft] = useState("1");
  const [estRight, setEstRight] = useState("");
  const wallet = useTonWallet();
  const { pay } = useTonPay();

  const apiUrl = useCallback(
    (path = "") => {
      const base = `${apiBase}${path}`;
      const slug = organizationSlug?.trim().toLowerCase();
      if (!slug) return base;
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}orgSlug=${encodeURIComponent(slug)}`;
    },
    [apiBase, organizationSlug],
  );

  const reload = useCallback(async () => {
    try {
      const r = await fetchJson(apiUrl(), { credentials: "include" });
      const parsed = await readJsonResponse<CardStatus>(r);
      if (parsed.ok) {
        setData(parsed.data);
        setWantCard(parsed.data.hasCard);
        if (parsed.data.holderError) setError(parsed.data.holderError);
      }
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    }
  }, [apiUrl]);

  const reloadActivity = useCallback(async () => {
    try {
      const r = await fetchJson(apiUrl("/activity"), { credentials: "include" });
      if (!r.ok) return;
      const j = (await r.json()) as { activities?: ActivityItem[] };
      setActivities(Array.isArray(j.activities) ? j.activities : []);
    } catch {
      /* ignore — empty list stays */
    }
  }, [apiUrl]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (data?.card?.status === "active") void reloadActivity();
  }, [data?.card?.status, data?.card?.id, reloadActivity]);

  useEffect(() => {
    void fetchJson("/api/public/openpay-card-momo-config")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (j: {
          enabled?: boolean;
          sandbox?: boolean;
          preferredRail?: string | null;
          rails?: { livepay?: boolean; relworx?: boolean; vixonpay?: boolean; sandbox?: boolean };
          note?: string;
        } | null) => {
          if (!j) return;
          setLivepayEnabled(Boolean(j.rails?.livepay));
          setRelworxEnabled(Boolean(j.rails?.relworx));
          setVixonpayEnabled(Boolean(j.rails?.vixonpay));
          setMomoSandbox(Boolean(j.sandbox));
          setMomoPreferredRail(j.preferredRail ?? null);
          setMomoNote(typeof j.note === "string" ? j.note : null);
        },
      )
      .catch(() => {
        setLivepayEnabled(false);
        setRelworxEnabled(false);
        setVixonpayEnabled(false);
        setMomoSandbox(false);
      });
  }, []);

  useEffect(() => {
    void fetchJson("/api/public/opgb-fx")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ugxPerUsd?: number; ugxPerTon?: number } | null) => {
        if (!j) return;
        if (typeof j.ugxPerUsd === "number" && j.ugxPerUsd > 0) setUgxPerUsd(j.ugxPerUsd);
        if (typeof j.ugxPerTon === "number" && j.ugxPerTon > 0) setUgxPerTon(j.ugxPerTon);
      })
      .catch(() => {});
  }, []);

  const rateForPair = estimatorPair === "usd-ugx" ? ugxPerUsd : ugxPerTon;

  function formatForeign(n: number): string {
    if (n >= 1) return n.toFixed(2).replace(/\.00$/, "");
    return n.toFixed(6).replace(/\.?0+$/, "");
  }

  function syncFromLeft(leftRaw: string, rate: number | null, flipped: boolean) {
    if (!rate) {
      setEstRight("");
      return;
    }
    const left = parseFloat(leftRaw.replace(/,/g, ""));
    if (Number.isNaN(left)) {
      setEstRight("");
      return;
    }
    if (flipped) {
      setEstRight(formatForeign(left / rate));
    } else {
      setEstRight(String(Math.round(left * rate)));
    }
  }

  useEffect(() => {
    const rate = estimatorPair === "usd-ugx" ? ugxPerUsd : ugxPerTon;
    syncFromLeft(estLeft, rate, estimatorFlipped);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync on rate/pair/flip only
  }, [ugxPerUsd, ugxPerTon, estimatorPair, estimatorFlipped]);

  const momoAvailable = momoSandbox || vixonpayEnabled || livepayEnabled || relworxEnabled;

  function pickMomoRail(): string | null {
    return (
      momoPreferredRail ||
      (vixonpayEnabled ? "vixonpay" : livepayEnabled ? "livepay" : relworxEnabled ? "relworx" : momoSandbox ? "sandbox" : null)
    );
  }

  useEffect(() => {
    if (momoAvailable) {
      setFundMode("momo");
      setIssueMode("momo");
    }
  }, [momoAvailable]);

  useEffect(() => {
    if (!data?.card || data.card.status !== "pending_issue") return;
    const t = setInterval(() => void reload(), 8000);
    return () => clearInterval(t);
  }, [data?.card, reload]);

  const toggleSheet = (id: Exclude<SheetId, null>) => {
    setSheet((s) => (s === id ? null : id));
    setError(null);
    setNote(null);
  };

  async function optIn() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(apiUrl("/opt-in"), {
        method: "POST",
        credentials: "include",
      });
      const parsed = await readJsonResponse<{ error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setWantCard(true);
      await reload();
      setNote(
        momoAvailable
          ? "OpenPayGB card reserved. Pay the issue fee with mobile money or TON to activate."
          : "OpenPayGB card reserved. Pay the TON issue fee to activate.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not opt in");
    } finally {
      setBusy(false);
    }
  }

  async function payIssueFee() {
    if (!wallet) {
      setError("Connect your TON wallet first.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await pay(async (senderAddr: string) => {
        const r = await fetch(apiUrl("/issue/transfer"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ senderAddr }),
        });
        const j = (await r.json()) as {
          error?: string;
          message?: { address: string; amount: string; payload: string };
          reference?: string;
        };
        if (!r.ok) throw new Error(j.error ?? "Could not prepare issue payment");
        if (!j.message || !j.reference) throw new Error("Invalid transfer response");
        return { message: j.message, reference: j.reference };
      });
      setNote("Issue payment sent. Activation usually confirms within a minute.");
      void reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function payIssueFeeMomo() {
    const rail = pickMomoRail();
    if (!rail) {
      setError("Mobile money activation is not available (configure LivePay / Relworx / VixonPay, or use sandbox).");
      return;
    }
    if (!momoPhone.trim()) {
      setError("Enter your mobile money number.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await fetchJson(apiUrl("/issue/momo-start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rail,
          phone: momoPhone.trim(),
          network: rail === "livepay" || rail === "sandbox" ? momoNetwork : undefined,
        }),
      });
      const j = (await r.json()) as { error?: string; message?: string; amountUgx?: number; sandbox?: boolean };
      if (!r.ok) throw new Error(j.error ?? "Could not start mobile money activation");
      const amountLabel =
        typeof j.amountUgx === "number" ? `UGX ${j.amountUgx.toLocaleString()}` : "the issue fee";
      setNote(
        j.message ??
          (j.sandbox
            ? `Sandbox: card activated for ${amountLabel}.`
            : `Approve the ${amountLabel} prompt on your phone. Your card activates after confirmation.`),
      );
      void reload();
    } catch (e) {
      setError(clientFetchErrorMessage(e, "Mobile money activation failed"));
    } finally {
      setBusy(false);
    }
  }

  async function fundCardMomo() {
    const amountUgx = parseInt(fundUgx.trim().replace(/,/g, ""), 10);
    if (Number.isNaN(amountUgx) || amountUgx < 1000) {
      setError("Enter at least UGX 1,000 to add.");
      return;
    }
    const rail = pickMomoRail();
    if (!rail) {
      setError("Mobile money top-up is not available (configure LivePay / Relworx / VixonPay, or use sandbox).");
      return;
    }
    if (!momoPhone.trim()) {
      setError("Enter your mobile money number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetchJson(apiUrl("/fund/momo-start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amountUgx,
          rail,
          phone: momoPhone.trim(),
          network: rail === "livepay" || rail === "sandbox" ? momoNetwork : undefined,
        }),
      });
      const j = (await r.json()) as { error?: string; message?: string; sandbox?: boolean };
      if (!r.ok) throw new Error(j.error ?? "Could not start mobile money top-up");
      setNote(j.message ?? "Approve the prompt on your phone. Balance updates after confirmation.");
      void reload();
      void reloadActivity();
    } catch (e) {
      setError(clientFetchErrorMessage(e, "Mobile money top-up failed"));
    } finally {
      setBusy(false);
    }
  }

  async function fundCard() {
    if (!wallet) {
      setError("Connect your TON wallet first.");
      return;
    }
    const amountUgx = parseInt(fundUgx.trim().replace(/,/g, ""), 10);
    if (Number.isNaN(amountUgx) || amountUgx < 1000) {
      setError("Enter at least UGX 1,000 to add.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await pay(async (senderAddr: string) => {
        const r = await fetch(apiUrl("/fund/transfer"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amountUgx, senderAddr }),
        });
        const j = (await r.json()) as {
          error?: string;
          message?: { address: string; amount: string; payload: string };
          reference?: string;
        };
        if (!r.ok) throw new Error(j.error ?? "Could not prepare top-up");
        if (!j.message || !j.reference) throw new Error("Invalid transfer response");
        return { message: j.message, reference: j.reference };
      });
      setNote("Top-up sent. Balance updates after on-chain confirmation.");
      void reload();
      void reloadActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Top-up failed");
    } finally {
      setBusy(false);
    }
  }

  async function cashoutMomo() {
    const amountUgx = parseInt(cashoutUgx.trim().replace(/,/g, ""), 10);
    if (Number.isNaN(amountUgx) || amountUgx < 1000) {
      setError("Enter at least UGX 1,000 to send.");
      return;
    }
    if (!cashoutPhone.trim()) {
      setError("Enter the Mobile Money number to receive funds.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await fetchJson(apiUrl("/cashout-momo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amountUgx,
          phone: cashoutPhone.trim(),
          network: cashoutNetwork,
        }),
      });
      const j = (await r.json()) as { error?: string; message?: string };
      if (!r.ok) throw new Error(j.error ?? "Cashout failed");
      setNote(j.message ?? "Cashout queued — Mobile Money payout is processing.");
      void reload();
      void reloadActivity();
    } catch (e) {
      setError(clientFetchErrorMessage(e, "Send to MoMo failed"));
    } finally {
      setBusy(false);
    }
  }

  async function setBlocked(blocked: boolean) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await fetchJson(apiUrl("/block"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ blocked }),
      });
      const j = (await r.json()) as { error?: string; blocked?: boolean };
      if (!r.ok) throw new Error(j.error ?? "Could not update card block status");
      setNote(blocked ? "Card blocked. Spending and cashout are paused." : "Card unblocked. You can use it again.");
      await reload();
    } catch (e) {
      setError(clientFetchErrorMessage(e, "Could not update block status"));
    } finally {
      setBusy(false);
    }
  }

  function onEstLeftChange(v: string) {
    setEstLeft(v);
    syncFromLeft(v, rateForPair, estimatorFlipped);
  }

  function onEstRightChange(v: string) {
    setEstRight(v);
    const rate = rateForPair;
    if (!rate) return;
    const right = parseFloat(v.replace(/,/g, ""));
    if (Number.isNaN(right) || right < 0) return;
    if (estimatorFlipped) {
      // right is foreign → left is UGX
      setEstLeft(String(Math.round(right * rate)));
    } else {
      setEstLeft(formatForeign(right / rate));
    }
  }

  function swapEstimator() {
    setEstLeft(estRight || "0");
    setEstRight(estLeft);
    setEstimatorFlipped((f) => !f);
  }

  const issueFee = data?.card?.issueFeeTon ?? data?.platform.issueFeeTon ?? 0;
  const issueFeeUgx = data?.platform.issueFeeUgx ?? null;

  const ratePill = useMemo(() => {
    if (estimatorPair === "usd-ugx" && ugxPerUsd) {
      return `1 USD = UGX ${Math.round(ugxPerUsd).toLocaleString()}`;
    }
    if (estimatorPair === "ton-ugx" && ugxPerTon) {
      return `1 TON = UGX ${Math.round(ugxPerTon).toLocaleString()}`;
    }
    return "Rates loading…";
  }, [estimatorPair, ugxPerUsd, ugxPerTon]);

  if (!data) {
    return (
      <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-sm">
        <p className="text-sm text-slate-500">Loading card…</p>
      </div>
    );
  }
  if (!data.platform.enabled) {
    return null;
  }

  const card = data.card;
  const isActive = card?.status === "active";
  const isBlocked = Boolean(card?.blocked);

  function renderMomoFields(forIssue: boolean) {
    return (
      <div className="flex flex-wrap items-end gap-2">
        {momoSandbox ? (
          <p className="w-full text-xs text-amber-700">
            {momoNote ||
              (forIssue
                ? "Sandbox MoMo — activates instantly without a live PSP prompt."
                : "Sandbox MoMo — credits instantly without a live PSP prompt.")}
          </p>
        ) : null}
        <label className="text-xs font-medium text-slate-500">
          Phone (UG)
          <input
            value={momoPhone}
            onChange={(e) => setMomoPhone(e.target.value)}
            placeholder="07…"
            className="mt-1 block w-40 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
          />
        </label>
        {livepayEnabled || momoSandbox ? (
          <label className="text-xs font-medium text-slate-500">
            Network
            <select
              value={momoNetwork}
              onChange={(e) => setMomoNetwork(e.target.value as "mtn" | "airtel")}
              className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
            >
              <option value="mtn">MTN</option>
              <option value="airtel">Airtel</option>
            </select>
          </label>
        ) : null}
      </div>
    );
  }

  function renderFundPanel() {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add funds (UGX)</p>
        <input
          value={fundUgx}
          onChange={(e) => setFundUgx(e.target.value)}
          className="block w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
        />
        <div className="flex flex-wrap gap-2">
          {momoAvailable ? (
            <button
              type="button"
              onClick={() => setFundMode("momo")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                fundMode === "momo"
                  ? "border border-emerald-500/40 bg-emerald-50 text-emerald-800"
                  : "border border-slate-200 text-slate-500"
              }`}
            >
              Mobile money
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setFundMode("ton")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              fundMode === "ton"
                ? "border border-sky-500/40 bg-sky-50 text-sky-800"
                : "border border-slate-200 text-slate-500"
            }`}
          >
            TON wallet
          </button>
        </div>
        {fundMode === "momo" && momoAvailable ? (
          <div className="space-y-3">
            {renderMomoFields(false)}
            <button
              type="button"
              disabled={busy}
              onClick={() => void fundCardMomo()}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Top up via MoMo
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <TonConnectButton />
            <button
              type="button"
              disabled={busy || !wallet}
              onClick={() => void fundCard()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              Top up via TON
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ——— Active card: Airtel-like light chrome ——— */
  if (isActive && card) {
    const panDisplay = detailsVisible ? card.maskedPan : "•••• •••• •••• ••••";
    const nameDisplay = detailsVisible
      ? (card.holderName || data.holder?.name || "CARD HOLDER").toUpperCase()
      : card.holderNameMasked || "•••• •••••";
    const validThru = detailsVisible ? card.validThru || "**/**" : "**/**";
    const balanceDisplay = balanceVisible
      ? formatUgx(card.balanceUgx)
      : `UGX ${"X".repeat(Math.max(3, String(card.balanceUgx).length))}`;

    return (
      <section className="rounded-2xl bg-white p-4 text-slate-900 shadow-sm sm:p-5">
        {/* Virtual card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-5 text-white shadow-lg">
          {isBlocked ? (
            <div className="pointer-events-none absolute -right-8 top-6 rotate-45 bg-rose-600 px-10 py-1 text-[10px] font-bold tracking-widest text-white shadow">
              BLOCKED
            </div>
          ) : null}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-black tracking-tight text-emerald-300">
                OP
              </span>
              <span className="text-sm font-semibold tracking-wide text-emerald-100/90">OPGB</span>
            </div>
            <button
              type="button"
              onClick={() => setDetailsVisible((v) => !v)}
              className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label={detailsVisible ? "Hide card details" : "Show card details"}
            >
              <EyeIcon open={detailsVisible} />
            </button>
          </div>

          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Card number</p>
          <p className="mt-1 font-mono text-lg tracking-[0.18em] sm:text-xl">{panDisplay}</p>

          <div className="mt-5 flex gap-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">Valid thru</p>
              <p className="mt-0.5 font-mono text-sm">{validThru}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">CVC</p>
              <p className="mt-0.5 font-mono text-sm">***</p>
            </div>
          </div>
          <p className="mt-1 text-[10px] text-white/40">Closed-loop OPGB card — CVC not issued</p>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">Name</p>
              <p className="mt-0.5 truncate text-sm font-medium tracking-wide">{nameDisplay}</p>
            </div>
            <span className="shrink-0 rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-200">
              {card.networkLabel || "OPGB"}
            </span>
          </div>
        </div>

        {/* Balance */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50/80 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-emerald-800/70">Card Balance</p>
            <p className="mt-0.5 text-xl font-bold tracking-tight text-emerald-900">{balanceDisplay}</p>
          </div>
          <button
            type="button"
            onClick={() => setBalanceVisible((v) => !v)}
            className="rounded-full p-2 text-emerald-700 hover:bg-emerald-100"
            aria-label={balanceVisible ? "Hide balance" : "Show balance"}
          >
            <EyeIcon open={balanceVisible} />
          </button>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {(
            [
              { id: "topup" as const, label: "Top Up Card", icon: "topup" as const },
              { id: "cashout" as const, label: "Send to MoMo", icon: "send" as const },
              { id: "block" as const, label: isBlocked ? "Unblock" : "Block Card", icon: "block" as const },
              { id: "settings" as const, label: "Settings", icon: "settings" as const },
            ] as const
          ).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => toggleSheet(a.id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center transition ${
                sheet === a.id
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  sheet === a.id ? "bg-emerald-600 text-white" : "bg-white text-emerald-700 shadow-sm"
                }`}
              >
                <ActionIcon kind={a.icon} />
              </span>
              <span className="text-[10px] font-semibold leading-tight sm:text-[11px]">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Sheets */}
        {sheet === "topup" ? (
          <div className="mt-4 space-y-3">
            <ModalHeader
              variant="light"
              onBack={() => setSheet(null)}
              title="Top up card"
              subtitle="Pay with Mobile Money or TON"
            />
            {renderFundPanel()}
          </div>
        ) : null}

        {sheet === "cashout" ? (
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <ModalHeader
              variant="light"
              onBack={() => setSheet(null)}
              title="Send to MoMo"
              subtitle="Cash out card balance"
            />
            <label className="block text-xs font-medium text-slate-500">
              Amount (UGX)
              <input
                value={cashoutUgx}
                onChange={(e) => setCashoutUgx(e.target.value)}
                className="mt-1 block w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
              />
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-medium text-slate-500">
                Phone (UG)
                <input
                  value={cashoutPhone}
                  onChange={(e) => setCashoutPhone(e.target.value)}
                  placeholder="07…"
                  className="mt-1 block w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                />
              </label>
              <label className="text-xs font-medium text-slate-500">
                Network
                <select
                  value={cashoutNetwork}
                  onChange={(e) => setCashoutNetwork(e.target.value as "MTN" | "AIRTEL")}
                  className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                >
                  <option value="MTN">MTN</option>
                  <option value="AIRTEL">Airtel</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              disabled={busy || isBlocked}
              onClick={() => void cashoutMomo()}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isBlocked ? "Unblock card to cash out" : "Send to MoMo"}
            </button>
          </div>
        ) : null}

        {sheet === "block" ? (
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <ModalHeader
              variant="light"
              onBack={() => setSheet(null)}
              title={isBlocked ? "Unblock card" : "Block card"}
            />
            <p className="text-xs text-slate-500">
              {isBlocked
                ? "Unblocking restores top-ups, cashout, and tuition payments from this card."
                : "Blocking pauses spending and cashout. You can unblock anytime from here or Settings."}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void setBlocked(!isBlocked)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                isBlocked ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {isBlocked ? "Confirm unblock" : "Confirm block"}
            </button>
          </div>
        ) : null}

        {sheet === "settings" ? (
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm">
            <ModalHeader variant="light" onBack={() => setSheet(null)} title="Card settings" />
            <dl className="space-y-2 text-slate-700">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Holder</dt>
                <dd className="text-right font-medium">{data.holder?.name || card.holderName || "—"}</dd>
              </div>
              {data.holder?.email ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="text-right font-medium">{data.holder.email}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">PAN</dt>
                <dd className="font-mono text-right text-xs">{card.maskedPan}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium">{isBlocked ? "Blocked" : "Active"}</dd>
              </div>
            </dl>
            <button
              type="button"
              disabled={busy}
              onClick={() => void setBlocked(!isBlocked)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                isBlocked ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {isBlocked ? "Unblock card" : "Block card"}
            </button>
            {showTuitionHint ? (
              <p className="text-xs text-slate-500">
                Pay tuition with this balance at{" "}
                <a href="/student/pay" className="font-semibold text-emerald-700 hover:underline">
                  Pay tuition
                </a>{" "}
                — choose &quot;Pay with {PAYMENT_RAIL_OPENPAY_CARD}&quot;.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Balance is closed-loop UGX on {OPEN_PAY_BRAND}. Fund with Mobile Money or TON.
              </p>
            )}
          </div>
        ) : null}

        {/* Cost estimator */}
        <div className="mt-5 rounded-xl border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cost estimator</p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
              {ratePill}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEstimatorPair("usd-ugx");
                setEstimatorFlipped(false);
                setEstLeft("1");
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                estimatorPair === "usd-ugx"
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 text-slate-500"
              }`}
            >
              USD ↔ UGX
            </button>
            <button
              type="button"
              onClick={() => {
                setEstimatorPair("ton-ugx");
                setEstimatorFlipped(false);
                setEstLeft("1");
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                estimatorPair === "ton-ugx"
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 text-slate-500"
              }`}
            >
              TON ↔ UGX
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {estimatorFlipped ? "UGX" : estimatorPair === "usd-ugx" ? "USD" : "TON"}
              </label>
              <input
                value={estLeft}
                onChange={(e) => onEstLeftChange(e.target.value)}
                inputMode="decimal"
                className="mt-0.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400"
              />
            </div>
            <button
              type="button"
              onClick={swapEstimator}
              className="mt-4 rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              aria-label="Swap amounts"
              title="Swap"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 7h11l-3-3M17 17H6l3 3" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {estimatorFlipped ? (estimatorPair === "usd-ugx" ? "USD" : "TON") : "UGX"}
              </label>
              <input
                value={estRight}
                onChange={(e) => onEstRightChange(e.target.value)}
                inputMode="decimal"
                className="mt-0.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">1 OPGB = 1 UGX · estimates only</p>
        </div>

        {/* Recent transactions */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent transactions</p>
          {activities.length === 0 ? (
            <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 10h18" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600">No transactions yet</p>
              <p className="mt-1 text-xs text-slate-400">Top up your card to see activity here.</p>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {activities.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{a.label}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(a.createdAt)}
                      {a.status !== "completed" ? ` · ${a.status}` : ""}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold ${
                      a.direction === "in"
                        ? "text-emerald-600"
                        : a.direction === "out"
                          ? "text-slate-800"
                          : "text-slate-500"
                    }`}
                  >
                    {a.direction === "in" ? "+" : a.direction === "out" ? "−" : ""}
                    {formatUgx(a.amountUgx)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {note ? <p className="mt-3 text-sm text-emerald-700">{note}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      </section>
    );
  }

  /* ——— Opt-in / pending issue ——— */
  return (
    <section className="rounded-2xl bg-white p-4 text-slate-900 shadow-sm sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700/80">{PAYMENT_RAIL_OPENPAY_CARD}</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">{OPEN_PAY_BRAND} Global Pay Card</h2>
      <p className="mt-2 text-sm text-slate-500">
        {showTuitionHint
          ? "Optional closed-loop card for tuition. Activate with Mobile Money (MTN / Airtel) or TON, then fund and pay tuition from the card at checkout."
          : "Your personal OpenPayGB wallet card. Activate with Mobile Money (MTN / Airtel) or TON, then fund the UGX balance."}
      </p>

      {!data.hasCard ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={wantCard}
            onChange={(e) => setWantCard(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            I want an {OPEN_PAY_BRAND} card (one-time issue fee: <strong>{issueFee} TON</strong>
            {issueFeeUgx != null ? <> / ≈ UGX {issueFeeUgx.toLocaleString()}</> : null}, set by platform admin)
          </span>
        </label>
      ) : null}

      {!data.hasCard && wantCard ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void optIn()}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Reserve my card
        </button>
      ) : null}

      {card?.status === "pending_issue" ? (
        <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm text-amber-900">
            Card reserved ({card.maskedPan}). Pay{" "}
            {issueFeeUgx != null ? (
              <>
                <strong>UGX {issueFeeUgx.toLocaleString()}</strong> via mobile money
                {momoAvailable ? "" : ` (≈ ${issueFee} TON)`}
              </>
            ) : (
              <strong>{issueFee} TON</strong>
            )}{" "}
            to activate.
          </p>
          <div className="flex flex-wrap gap-2">
            {momoAvailable ? (
              <button
                type="button"
                onClick={() => setIssueMode("momo")}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  issueMode === "momo"
                    ? "border border-emerald-500/40 bg-emerald-100 text-emerald-800"
                    : "border border-slate-200 text-slate-500"
                }`}
              >
                Mobile money
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIssueMode("ton")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                issueMode === "ton"
                  ? "border border-sky-500/40 bg-sky-100 text-sky-800"
                  : "border border-slate-200 text-slate-500"
              }`}
            >
              TON wallet
            </button>
          </div>
          {issueMode === "momo" && momoAvailable ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
              {renderMomoFields(true)}
              <button
                type="button"
                disabled={busy}
                onClick={() => void payIssueFeeMomo()}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Pay with Mobile Money to activate
                {issueFeeUgx != null ? ` (UGX ${issueFeeUgx.toLocaleString()})` : ""}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
              <TonConnectButton />
              <button
                type="button"
                disabled={busy || !wallet}
                onClick={() => void payIssueFee()}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Pay {issueFee} TON to activate
              </button>
            </div>
          )}
        </div>
      ) : null}

      {note ? <p className="mt-3 text-sm text-emerald-700">{note}</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}

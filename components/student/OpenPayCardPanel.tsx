"use client";

import { useCallback, useEffect, useState } from "react";
import { TonConnectButton, useTonWallet } from "@tonconnect/ui-react";
import { useTonPay } from "@ton-pay/ui-react";
import { OPEN_PAY_BRAND, PAYMENT_RAIL_OPENPAY_CARD } from "@/lib/open-pay-brand";
import { readJsonResponse } from "@/utils/read-json-response";

type CardStatus = {
  platform: { enabled: boolean; issueFeeTon: number };
  card: {
    id: string;
    status: string;
    balanceUgx: number;
    maskedPan: string;
    issuedAt: string | null;
    issueFeeTon: number | null;
  } | null;
  hasCard: boolean;
  canPayTuition: boolean;
};

export function OpenPayCardPanel() {
  const [data, setData] = useState<CardStatus | null>(null);
  const [wantCard, setWantCard] = useState(false);
  const [fundUgx, setFundUgx] = useState("50000");
  const [fundMode, setFundMode] = useState<"ton" | "momo">("momo");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoNetwork, setMomoNetwork] = useState<"mtn" | "airtel">("mtn");
  const [livepayEnabled, setLivepayEnabled] = useState(false);
  const [relworxEnabled, setRelworxEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wallet = useTonWallet();
  const { pay } = useTonPay();

  const reload = useCallback(async () => {
    const r = await fetch("/api/student/openpay-card", { credentials: "include" });
    const parsed = await readJsonResponse<CardStatus>(r);
    if (parsed.ok) {
      setData(parsed.data);
      setWantCard(parsed.data.hasCard);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    void fetch("/api/public/livepay-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setLivepayEnabled(Boolean(j?.enabled)))
      .catch(() => setLivepayEnabled(false));
    void fetch("/api/public/relworx-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setRelworxEnabled(Boolean(j?.enabled)))
      .catch(() => setRelworxEnabled(false));
  }, []);

  useEffect(() => {
    if (livepayEnabled || relworxEnabled) setFundMode("momo");
  }, [livepayEnabled, relworxEnabled]);

  useEffect(() => {
    if (!data?.card || data.card.status !== "pending_issue") return;
    const t = setInterval(() => void reload(), 8000);
    return () => clearInterval(t);
  }, [data?.card, reload]);

  if (!data) {
    return <p className="text-sm text-slate-500">Loading card…</p>;
  }
  if (!data.platform.enabled) {
    return null;
  }

  async function optIn() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/student/openpay-card/opt-in", {
        method: "POST",
        credentials: "include",
      });
      const parsed = await readJsonResponse<{ error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setWantCard(true);
      await reload();
      setNote("OpenPayGB card reserved. Pay the TON issue fee to activate.");
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
        const r = await fetch("/api/student/openpay-card/issue/transfer", {
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

  async function fundCardMomo() {
    const amountUgx = parseInt(fundUgx.trim().replace(/,/g, ""), 10);
    if (Number.isNaN(amountUgx) || amountUgx < 1000) {
      setError("Enter at least UGX 1,000 to add.");
      return;
    }
    const rail = livepayEnabled ? "livepay" : relworxEnabled ? "relworx" : null;
    if (!rail) {
      setError("Mobile money top-up is not available (LivePay / Relworx not configured).");
      return;
    }
    if (!momoPhone.trim()) {
      setError("Enter your mobile money number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/student/openpay-card/fund/momo-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amountUgx,
          rail,
          phone: momoPhone.trim(),
          network: rail === "livepay" ? momoNetwork : undefined,
        }),
      });
      const j = (await r.json()) as { error?: string; message?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not start mobile money top-up");
      setNote(j.message ?? "Approve the prompt on your phone. Balance updates after confirmation.");
      void reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mobile money top-up failed");
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
        const r = await fetch("/api/student/openpay-card/fund/transfer", {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Top-up failed");
    } finally {
      setBusy(false);
    }
  }

  const issueFee = data.card?.issueFeeTon ?? data.platform.issueFeeTon;

  return (
    <section className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-violet-300/90">{PAYMENT_RAIL_OPENPAY_CARD}</p>
      <h2 className="mt-1 text-lg font-semibold text-white">{OPEN_PAY_BRAND} platform card</h2>
      <p className="mt-2 text-sm text-slate-400">
        Optional closed-loop card for tuition. You choose whether to get a card and whether to pay tuition from it at
        checkout.
      </p>

      {!data.hasCard ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={wantCard}
            onChange={(e) => setWantCard(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20"
          />
          <span>
            I want an {OPEN_PAY_BRAND} card (one-time issue fee: <strong>{issueFee} TON</strong>, set by platform admin)
          </span>
        </label>
      ) : null}

      {!data.hasCard && wantCard ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void optIn()}
          className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          Reserve my card
        </button>
      ) : null}

      {data.card?.status === "pending_issue" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-amber-200/90">
            Card reserved ({data.card.maskedPan}). Pay <strong>{issueFee} TON</strong> to activate.
          </p>
          <TonConnectButton />
          <button
            type="button"
            disabled={busy || !wallet}
            onClick={() => void payIssueFee()}
            className="rounded-lg border border-violet-400/40 bg-violet-600/80 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Pay {issueFee} TON to activate
          </button>
        </div>
      ) : null}

      {data.card?.status === "active" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-300">
            <span className="font-mono text-violet-200">{data.card.maskedPan}</span>
            {" · "}
            Balance <strong className="text-white">UGX {data.card.balanceUgx.toLocaleString()}</strong>
          </p>
          <p className="text-xs text-slate-500">
            At <a href="/student/pay" className="text-cyan-400 hover:underline">Pay tuition</a>, choose &quot;Pay with{" "}
            {PAYMENT_RAIL_OPENPAY_CARD}&quot; when you want to use this balance.
          </p>
          <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold text-slate-400">Add funds (UGX)</p>
            <input
              value={fundUgx}
              onChange={(e) => setFundUgx(e.target.value)}
              className="block w-full max-w-xs rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <div className="flex flex-wrap gap-2">
              {(livepayEnabled || relworxEnabled) ? (
                <button
                  type="button"
                  onClick={() => setFundMode("momo")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    fundMode === "momo"
                      ? "bg-emerald-600/30 text-emerald-100 border border-emerald-400/40"
                      : "border border-white/10 text-slate-400"
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
                    ? "bg-sky-600/30 text-sky-100 border border-sky-400/40"
                    : "border border-white/10 text-slate-400"
                }`}
              >
                TON wallet
              </button>
            </div>
            {fundMode === "momo" && (livepayEnabled || relworxEnabled) ? (
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-slate-500">
                  Phone (UG)
                  <input
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    placeholder="07…"
                    className="mt-1 block w-40 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  />
                </label>
                {livepayEnabled ? (
                  <label className="text-xs text-slate-500">
                    Network
                    <select
                      value={momoNetwork}
                      onChange={(e) => setMomoNetwork(e.target.value as "mtn" | "airtel")}
                      className="mt-1 block rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    >
                      <option value="mtn">MTN</option>
                      <option value="airtel">Airtel</option>
                    </select>
                  </label>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void fundCardMomo()}
                  className="rounded-lg bg-emerald-600/80 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
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
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
                >
                  Top up via TON
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {note ? <p className="mt-3 text-sm text-cyan-200/90">{note}</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
    </section>
  );
}

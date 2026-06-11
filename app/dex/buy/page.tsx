"use client";

import Link from "next/link";
import { useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

const CRYPTO_OPTIONS = ["TON", "USDT", "BTC", "ETH"] as const;
type Crypto = (typeof CRYPTO_OPTIONS)[number];

type BuyQuote = {
  crypto: string;
  fiatAmount: number;
  feeUgx: number;
  totalFiatUgx: number;
  cryptoAmount: number;
  opgbSettlementMinor: number;
  stepsReady: boolean;
};

type BuySummary = {
  step1_crypto: string;
  step2_fiatSpendUgx: number;
  step3_cryptoReceive: number;
  step4_feeUgx: number;
  step5_totalFiatUgx: number;
  step6_action: string;
  step7_checks: string[];
  step8_execute: string;
};

export default function DexBuyPage() {
  const [crypto, setCrypto] = useState<Crypto>("TON");
  const [fiatAmount, setFiatAmount] = useState("100000");
  const [quote, setQuote] = useState<BuyQuote | null>(null);
  const [summary, setSummary] = useState<BuySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [buyBusy, setBuyBusy] = useState(false);

  async function fetchQuote(e: React.FormEvent) {
    e.preventDefault();
    setQuoteBusy(true);
    setError(null);
    setMsg(null);
    setQuote(null);
    setSummary(null);
    try {
      const n = parseFloat(fiatAmount.replace(/,/g, ""));
      if (!n || n <= 0) throw new Error("Enter a valid UGX amount");
      const r = await fetch(
        `/api/public/dex/buy-quote?crypto=${encodeURIComponent(crypto)}&fiatAmountUgx=${encodeURIComponent(String(n))}`,
      );
      const parsed = await readJsonResponse<{ quote?: BuyQuote; summary?: BuySummary; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setQuote(parsed.data.quote ?? null);
      setSummary(parsed.data.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
    } finally {
      setQuoteBusy(false);
    }
  }

  async function executeBuy() {
    if (!quote) return;
    setBuyBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await fetch("/api/public/dex/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crypto: quote.crypto, fiatAmountUgx: quote.fiatAmount }),
      });
      const parsed = await readJsonResponse<{ message?: string; nextPath?: string; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setMsg(parsed.data.message ?? "Buy queued.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Buy failed");
    } finally {
      setBuyBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Buy crypto</h1>
      <p className="mt-2 text-sm text-slate-400">
        Fiat → crypto via OPGB settlement (1 OPGB = 1 UGX). Eight-step flow with live quote.
      </p>

      <form onSubmit={(e) => void fetchQuote(e)} className="mt-6 space-y-3">
        <div>
          <label className="text-xs text-slate-500">Step 1 — Select crypto</label>
          <select
            value={crypto}
            onChange={(e) => setCrypto(e.target.value as Crypto)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          >
            {CRYPTO_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Step 2 — Fiat amount (UGX)</label>
          <input
            value={fiatAmount}
            onChange={(e) => setFiatAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            inputMode="numeric"
          />
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {msg ? <p className="text-sm text-emerald-300">{msg}</p> : null}
        <button
          type="submit"
          disabled={quoteBusy}
          className="w-full rounded-lg bg-violet-500 py-2 font-semibold text-white disabled:opacity-50"
        >
          {quoteBusy ? "Loading quote…" : "Preview quote (steps 3–5)"}
        </button>
      </form>

      {quote && summary ? (
        <div className="mt-6 space-y-4 rounded-xl border border-white/10 p-4 text-sm">
          <p>
            <span className="text-slate-400">Step 3 — You receive:</span>{" "}
            <strong className="text-white">
              {quote.cryptoAmount} {quote.crypto}
            </strong>
          </p>
          <p>
            <span className="text-slate-400">Step 4 — Fee:</span> UGX {quote.feeUgx.toLocaleString()}
          </p>
          <p>
            <span className="text-slate-400">Step 5 — Total spend:</span> UGX {quote.totalFiatUgx.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">
            OPGB settlement: {quote.opgbSettlementMinor.toLocaleString()} minor units · checks:{" "}
            {summary.step7_checks.join(", ")} · execute: {summary.step8_execute}
          </p>
          <button
            type="button"
            disabled={buyBusy || !quote.stepsReady}
            onClick={() => void executeBuy()}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-sky-500 py-2.5 font-semibold text-slate-950 disabled:opacity-50"
          >
            {buyBusy ? "Processing…" : "Step 6 — Buy"}
          </button>
          <p className="text-xs text-slate-500">
            Phase 3: hybrid DEX / AMM / P2P escrow completes on-chain settlement. Until then, continue via{" "}
            <Link href="/dex/onramp" className="text-cyan-300 underline">
              onramp
            </Link>
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}

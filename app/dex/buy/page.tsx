"use client";

import { useCallback, useEffect, useState } from "react";
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

function parseFiatInput(raw: string): number | null {
  const n = parseFloat(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default function DexBuyPage() {
  const [crypto, setCrypto] = useState<Crypto>("TON");
  const [fiatAmount, setFiatAmount] = useState("100000");
  const [quote, setQuote] = useState<BuyQuote | null>(null);
  const [summary, setSummary] = useState<BuySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [buyBusy, setBuyBusy] = useState(false);

  const loadQuote = useCallback(async (amountUgx: number, asset: Crypto) => {
    setQuoteBusy(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/public/dex/buy-quote?crypto=${encodeURIComponent(asset)}&fiatAmountUgx=${encodeURIComponent(String(amountUgx))}`,
      );
      const parsed = await readJsonResponse<{ quote?: BuyQuote; summary?: BuySummary; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setQuote(parsed.data.quote ?? null);
      setSummary(parsed.data.summary ?? null);
    } catch (err) {
      setQuote(null);
      setSummary(null);
      setError(err instanceof Error ? err.message : "Quote failed");
    } finally {
      setQuoteBusy(false);
    }
  }, []);

  useEffect(() => {
    const amount = parseFiatInput(fiatAmount);
    if (amount == null) {
      setQuote(null);
      setSummary(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void loadQuote(amount, crypto);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [crypto, fiatAmount, loadQuote]);

  async function executeBuy() {
    if (!quote) return;
    setBuyBusy(true);
    setError(null);
    setMsg(null);
    try {
      let r = await fetch("/api/student/dex/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ crypto: quote.crypto, fiatAmountUgx: quote.fiatAmount }),
      });
      if (r.status === 401) {
        r = await fetch("/api/public/dex/buy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ crypto: quote.crypto, fiatAmountUgx: quote.fiatAmount }),
        });
      }
      const parsed = await readJsonResponse<{ message?: string; nextPath?: string; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setMsg(parsed.data.message ?? "Buy complete.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Buy failed");
    } finally {
      setBuyBusy(false);
    }
  }

  const amountValid = parseFiatInput(fiatAmount) != null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Buy crypto</h1>
      <p className="mt-2 text-sm text-slate-400">
        Fiat → crypto via OPGB settlement (1 OPGB = 1 UGX). Quote updates as you type.
      </p>

      <div className="mt-6 space-y-3">
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
        {!amountValid && fiatAmount.trim() ? (
          <p className="text-sm text-amber-200/90">Enter a valid UGX amount to preview the quote.</p>
        ) : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {msg ? <p className="text-sm text-emerald-300">{msg}</p> : null}
      </div>

      <div className="mt-6 rounded-xl border border-white/10 p-4 text-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200">Preview quote</p>
        {quoteBusy ? (
          <p className="mt-3 text-slate-400">Calculating…</p>
        ) : quote && summary ? (
          <div className="mt-3 space-y-2">
            <p>
              <span className="text-slate-400">You receive:</span>{" "}
              <strong className="text-white">
                {quote.cryptoAmount} {quote.crypto}
              </strong>
            </p>
            <dl className="space-y-1.5 border-t border-white/10 pt-3">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Fee</dt>
                <dd className="font-mono text-white">UGX {quote.feeUgx.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Total spend</dt>
                <dd className="font-mono text-white">UGX {quote.fiatAmount.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-2 font-semibold">
                <dt className="text-slate-300">Settlement</dt>
                <dd className="font-mono text-cyan-200">UGX {quote.totalFiatUgx.toLocaleString()}</dd>
              </div>
            </dl>
            <p className="pt-1 text-xs text-slate-500">
              Checks: {summary.step7_checks.join(", ")} · {summary.step8_execute}
            </p>
            <button
              type="button"
              disabled={buyBusy || !quote.stepsReady}
              onClick={() => void executeBuy()}
              className="mt-2 w-full rounded-lg bg-gradient-to-r from-cyan-400 to-sky-500 py-2.5 font-semibold text-slate-950 disabled:opacity-50"
            >
              {buyBusy ? "Processing…" : "Buy crypto"}
            </button>
            <p className="text-xs text-slate-500">
              Signed-in students settle instantly from OPGB balance. Guests queue for ops settlement.
            </p>
          </div>
        ) : amountValid ? (
          <p className="mt-3 text-slate-500">Waiting for quote…</p>
        ) : (
          <p className="mt-3 text-slate-500">Enter an amount to see fee, total spend, and settlement.</p>
        )}
      </div>
    </div>
  );
}

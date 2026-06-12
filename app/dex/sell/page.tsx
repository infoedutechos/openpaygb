"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

const CRYPTO_OPTIONS = ["TON", "USDT", "BTC", "ETH"] as const;
type Crypto = (typeof CRYPTO_OPTIONS)[number];

type SellQuote = {
  crypto: string;
  cryptoAmount: number;
  grossUgx: number;
  feeUgx: number;
  settlementUgx: number;
  stepsReady: boolean;
};

function parseCryptoInput(raw: string): number | null {
  const n = parseFloat(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default function DexSellPage() {
  const [crypto, setCrypto] = useState<Crypto>("TON");
  const [cryptoAmount, setCryptoAmount] = useState("0.25");
  const [quote, setQuote] = useState<SellQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);

  const loadQuote = useCallback(async (amount: number, asset: Crypto) => {
    setQuoteBusy(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/public/dex/sell-quote?crypto=${encodeURIComponent(asset)}&cryptoAmount=${encodeURIComponent(String(amount))}`,
      );
      const parsed = await readJsonResponse<{ quote?: SellQuote; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setQuote(parsed.data.quote ?? null);
    } catch (err) {
      setQuote(null);
      setError(err instanceof Error ? err.message : "Quote failed");
    } finally {
      setQuoteBusy(false);
    }
  }, []);

  useEffect(() => {
    const amount = parseCryptoInput(cryptoAmount);
    if (amount == null) {
      setQuote(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void loadQuote(amount, crypto);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [crypto, cryptoAmount, loadQuote]);

  const amountValid = parseCryptoInput(cryptoAmount) != null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Sell crypto</h1>
      <p className="mt-2 text-sm text-slate-400">
        Crypto → UGX via OPGB FX. Quote updates as you type; settle via offramp when signed in.
      </p>

      <div className="mt-6 space-y-3">
        <div>
          <label className="text-xs text-slate-500">Crypto asset</label>
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
          <label className="text-xs text-slate-500">Amount to sell</label>
          <input
            value={cryptoAmount}
            onChange={(e) => setCryptoAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            inputMode="decimal"
          />
        </div>
        {!amountValid && cryptoAmount.trim() ? (
          <p className="text-sm text-amber-200/90">Enter a valid crypto amount to preview the quote.</p>
        ) : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>

      <div className="mt-6 rounded-xl border border-white/10 p-4 text-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200">Preview quote</p>
        {quoteBusy ? (
          <p className="mt-3 text-slate-400">Calculating…</p>
        ) : quote ? (
          <div className="mt-3 space-y-2">
            <p>
              <span className="text-slate-400">You sell:</span>{" "}
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
                <dt className="text-slate-400">Sale value</dt>
                <dd className="font-mono text-white">UGX {quote.grossUgx.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-2 font-semibold">
                <dt className="text-slate-300">Settlement</dt>
                <dd className="font-mono text-cyan-200">UGX {quote.settlementUgx.toLocaleString()}</dd>
              </div>
            </dl>
            <p className="pt-1 text-xs text-slate-500">Settlement is what you receive after the platform fee.</p>
            <Link
              href="/dex/offramp"
              className="mt-2 block w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-center font-semibold text-slate-950"
            >
              Continue to offramp
            </Link>
          </div>
        ) : amountValid ? (
          <p className="mt-3 text-slate-500">Waiting for quote…</p>
        ) : (
          <p className="mt-3 text-slate-500">Enter an amount to see fee, sale value, and settlement.</p>
        )}
      </div>
    </div>
  );
}

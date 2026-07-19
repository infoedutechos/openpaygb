"use client";

import { useCallback, useEffect, useState } from "react";
import { DexPageBack } from "@/components/dex/DexPageBack";
import { readJsonResponse } from "@/utils/read-json-response";

type Quote = {
  direction: string;
  inputAmount: number;
  outputAmount: number;
  ugxPerTon: number;
  source: string;
};

function parseAmountInput(raw: string): number | null {
  const n = parseFloat(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default function DexConvertPage() {
  const [direction, setDirection] = useState<"ugx_to_ton" | "ton_to_ugx">("ugx_to_ton");
  const [amount, setAmount] = useState("100000");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadQuote = useCallback(async (dir: "ugx_to_ton" | "ton_to_ugx", value: number) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/public/convert/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: dir, amount: value }),
      });
      const parsed = await readJsonResponse<{ quote?: Quote }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setQuote(parsed.data.quote ?? null);
    } catch (err) {
      setQuote(null);
      setError(err instanceof Error ? err.message : "Quote failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const value = parseAmountInput(amount);
    if (value == null) {
      setQuote(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void loadQuote(direction, value);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [direction, amount, loadQuote]);

  const amountValid = parseAmountInput(amount) != null;
  const inputUnit = direction === "ugx_to_ton" ? "UGX" : "TON";
  const outputUnit = direction === "ugx_to_ton" ? "TON" : "UGX";

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <DexPageBack />
      <h1 className="text-2xl font-semibold text-white">Convert (quote preview)</h1>
      <p className="mt-2 text-sm text-slate-400">
        Live UGX ↔ TON quote preview only. To execute a swap, use{" "}
        <a href="/dex/amm" className="text-cyan-300 underline-offset-2 hover:underline">
          AMM swap
        </a>
        .
      </p>

      <div className="mt-6 space-y-3">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as "ugx_to_ton" | "ton_to_ugx")}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
        >
          <option value="ugx_to_ton">UGX → TON</option>
          <option value="ton_to_ugx">TON → UGX</option>
        </select>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          inputMode="decimal"
        />
        {!amountValid && amount.trim() ? (
          <p className="text-sm text-amber-200/90">Enter a valid amount to preview the quote.</p>
        ) : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>

      <div className="mt-6 rounded-xl border border-white/10 p-4 text-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200">Preview quote</p>
        {busy ? (
          <p className="mt-3 text-slate-400">Calculating…</p>
        ) : quote ? (
          <div className="mt-3 space-y-2">
            <p>
              <span className="text-slate-400">You send:</span>{" "}
              <strong className="text-white">
                {quote.inputAmount.toLocaleString()} {inputUnit}
              </strong>
            </p>
            <p className="text-lg font-semibold text-cyan-200">
              ≈ {quote.outputAmount.toLocaleString()} {outputUnit}
            </p>
            <p className="text-xs text-slate-500">
              Rate: {quote.ugxPerTon.toLocaleString()} UGX/TON · {quote.source}
            </p>
          </div>
        ) : amountValid ? (
          <p className="mt-3 text-slate-500">Waiting for quote…</p>
        ) : (
          <p className="mt-3 text-slate-500">Enter an amount to preview the conversion.</p>
        )}
      </div>
    </div>
  );
}

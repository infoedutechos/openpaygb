"use client";

import { useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type Quote = {
  direction: string;
  inputAmount: number;
  outputAmount: number;
  ugxPerTon: number;
  source: string;
};

export default function DexConvertPage() {
  const [direction, setDirection] = useState<"ugx_to_ton" | "ton_to_ugx">("ugx_to_ton");
  const [amount, setAmount] = useState("100000");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function fetchQuote(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setQuote(null);
    try {
      const n = parseFloat(amount.replace(/,/g, ""));
      if (!n || n <= 0) throw new Error("Enter a valid amount");
      const r = await fetch("/api/public/convert/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, amount: n }),
      });
      const parsed = await readJsonResponse<{ quote?: Quote }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setQuote(parsed.data.quote ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Convert</h1>
      <p className="mt-2 text-sm text-slate-400">Live UGX ↔ TON quotes from OpenPayGB FX.</p>

      <form onSubmit={(e) => void fetchQuote(e)} className="mt-6 space-y-3">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as "ugx_to_ton" | "ton_to_ugx")}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
        >
          <option value="ugx_to_ton">UGX → TON</option>
          <option value="ton_to_ugx">TON → UGX</option>
        </select>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
          inputMode="decimal"
        />
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-violet-500 py-2 font-semibold text-white">
          {busy ? "Quoting…" : "Get quote"}
        </button>
      </form>

      {quote ? (
        <div className="mt-6 rounded-xl border border-white/10 p-4 text-sm">
          <p>
            <span className="text-slate-400">You send:</span> {quote.inputAmount.toLocaleString()}{" "}
            {quote.direction === "ugx_to_ton" ? "UGX" : "TON"}
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            ≈ {quote.outputAmount.toLocaleString()} {quote.direction === "ugx_to_ton" ? "TON" : "UGX"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Rate: {quote.ugxPerTon.toLocaleString()} UGX/TON · {quote.source}
          </p>
        </div>
      ) : null}
    </div>
  );
}

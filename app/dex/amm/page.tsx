"use client";

import Link from "next/link";
import { useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type AmmQuote = {
  pair: string;
  inputAmount: number;
  outputAmount: number;
  outputAsset: string;
  priceImpactBps: number;
};

export default function DexAmmPage() {
  const [pair, setPair] = useState<"OPGB_TON" | "OPGB_USDT">("OPGB_TON");
  const [amount, setAmount] = useState("100000");
  const [quote, setQuote] = useState<AmmQuote | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadQuote(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    setQuote(null);
    try {
      const n = parseFloat(amount.replace(/,/g, ""));
      if (!n || n <= 0) throw new Error("Enter a valid UGX amount");
      const r = await fetch(
        `/api/public/dex/amm-quote?pair=${encodeURIComponent(pair)}&inputAmountUgx=${encodeURIComponent(String(n))}`,
      );
      const parsed = await readJsonResponse<{ quote?: AmmQuote; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setQuote(parsed.data.quote ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
    } finally {
      setBusy(false);
    }
  }

  async function executeSwap() {
    if (!quote) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await fetch("/api/student/dex/amm-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pair: quote.pair, inputAmountUgx: quote.inputAmount }),
      });
      const parsed = await readJsonResponse<{ message?: string; nextPath?: string; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setMsg(parsed.data.message ?? "Swap completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Swap failed — sign in at /student/login and fund OPGB first");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">AMM swap</h1>
      <p className="mt-2 text-sm text-slate-400">
        Swap OPGB (1:1 UGX) into TON or USDT. Custodial pool — sign in to execute.
      </p>

      <form onSubmit={(e) => void loadQuote(e)} className="mt-6 space-y-3">
        <select
          value={pair}
          onChange={(e) => setPair(e.target.value as "OPGB_TON" | "OPGB_USDT")}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
        >
          <option value="OPGB_TON">OPGB → TON</option>
          <option value="OPGB_USDT">OPGB → USDT</option>
        </select>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          placeholder="Input UGX"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-violet-600 py-2 font-semibold text-white disabled:opacity-50"
        >
          Get quote
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      {msg ? <p className="mt-4 text-sm text-emerald-300">{msg}</p> : null}

      {quote ? (
        <div className="mt-6 rounded-xl border border-white/10 p-4 text-sm">
          <p>
            Receive: <strong>{quote.outputAmount} {quote.outputAsset}</strong>
          </p>
          <p className="mt-1 text-slate-400">Price impact: {quote.priceImpactBps} bps</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void executeSwap()}
            className="mt-4 w-full rounded-lg bg-cyan-500 py-2.5 font-semibold text-slate-950 disabled:opacity-50"
          >
            Execute swap (student sign-in)
          </button>
          <p className="mt-3 text-xs text-slate-500">
            <Link href="/student/login" className="text-cyan-300 underline">
              Sign in
            </Link>{" "}
            ·{" "}
            <Link href="/dex/onramp" className="text-cyan-300 underline">
              Onramp
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}

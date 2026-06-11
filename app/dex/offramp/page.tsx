"use client";

import Link from "next/link";
import { useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

const ASSETS = ["opgb", "ton", "usdt", "btc", "eth"] as const;
const RAILS = ["momo", "ton", "bank"] as const;

export default function DexOfframpPage() {
  const [asset, setAsset] = useState<(typeof ASSETS)[number]>("opgb");
  const [rail, setRail] = useState<(typeof RAILS)[number]>("momo");
  const [amount, setAmount] = useState("50000");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const n = parseFloat(amount.replace(/,/g, ""));
      if (!n || n <= 0) throw new Error("Enter a valid amount");
      if (!destination.trim()) throw new Error("Destination is required");

      const r = await fetch("/api/student/opgb-wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ asset, amount: n, rail, destination: destination.trim() }),
      });
      const parsed = await readJsonResponse<{ message?: string; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setMsg(parsed.data.message ?? "Withdrawal processed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Offramp / Withdraw</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Move OPGB or custodial crypto to mobile money, TON wallet, or bank. Requires student sign-in and sufficient
          balance.
        </p>
      </div>

      <form onSubmit={(e) => void submit(e)} className="space-y-4 rounded-xl border border-white/10 p-4">
        <div>
          <label className="text-xs text-slate-500">Asset</label>
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value as (typeof ASSETS)[number])}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          >
            {ASSETS.map((a) => (
              <option key={a} value={a}>
                {a.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            inputMode="decimal"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Payout rail</label>
          <select
            value={rail}
            onChange={(e) => setRail(e.target.value as (typeof RAILS)[number])}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          >
            {RAILS.map((r) => (
              <option key={r} value={r}>
                {r.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Destination (phone, TON address, or account)</label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            placeholder="+256… or UQ…"
          />
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {msg ? <p className="text-sm text-emerald-300">{msg}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 font-semibold text-slate-950 disabled:opacity-50"
        >
          {busy ? "Processing…" : "Withdraw"}
        </button>
      </form>

      <p className="text-xs text-slate-500">
        <Link href="/student/login" className="text-cyan-300 underline">
          Sign in
        </Link>{" "}
        as a student · fund OPGB via{" "}
        <Link href="/student/card" className="text-cyan-300 underline">
          OpenPayGB card
        </Link>{" "}
        or{" "}
        <Link href="/dex/buy" className="text-cyan-300 underline">
          buy crypto
        </Link>
      </p>
      <Link href="/dex" className="text-sm font-medium text-violet-300 hover:text-white">
        ← Dex Hub home
      </Link>
    </div>
  );
}

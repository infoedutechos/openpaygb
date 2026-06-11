"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type BalanceLine = {
  currency: string;
  amount: number;
  unit: string;
  quotedFromOpgb: boolean;
  previewOnly: boolean;
  custodial?: boolean;
};

type LedgerEntry = {
  id: string;
  direction: string;
  amountMinor: number;
  kind: string;
  memo: string;
  createdAt: string;
};

type WalletPayload = {
  phase: number;
  portfolioValueUgx: number;
  balanceUgx: number;
  balances: BalanceLine[];
  entries?: LedgerEntry[];
  fx?: { source: string; fetchedAt: string };
};

export function OpgbWalletPanel() {
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/student/opgb-wallet", { credentials: "include" });
        if (r.status === 401) return;
        if (!r.ok) {
          const j = (await r.json()) as { error?: string };
          throw new Error(j.error ?? "Could not load OPGB wallet");
        }
        setWallet((await r.json()) as WalletPayload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading OPGB wallet…</p>;
  if (error) return <p className="text-sm text-rose-400">{error}</p>;
  if (!wallet) return null;

  const mask = (n: number, unit: string) => (hidden ? "••••••" : `${n.toLocaleString()} ${unit}`);

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-violet-950/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-200/90">OPGB wallet</p>
          <p className="mt-1 text-sm text-slate-400">
            Phase {wallet.phase} · 1 OPGB = 1 UGX · portfolio UGX{" "}
            {hidden ? "••••••" : wallet.portfolioValueUgx.toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
        >
          {hidden ? "Show balances" : "Hide balances"}
        </button>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {wallet.balances.map((line) => (
          <li key={line.currency} className="flex items-center justify-between gap-3">
            <span className="uppercase text-slate-400">{line.currency}</span>
            <span className="font-mono text-slate-100">
              {mask(line.amount, line.unit)}
              {line.custodial ? (
                <span className="ml-2 text-[10px] text-emerald-500/90">custodial</span>
              ) : line.quotedFromOpgb && !line.previewOnly ? (
                <span className="ml-2 text-[10px] text-slate-500">FX from OPGB</span>
              ) : line.previewOnly ? (
                <span className="ml-2 text-[10px] text-slate-600">preview</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {wallet.entries && wallet.entries.length > 0 ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent activity</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-400">
            {wallet.entries.slice(0, 8).map((e) => (
              <li key={e.id} className="flex justify-between gap-2">
                <span>
                  {e.direction === "credit" ? "+" : "−"}
                  {e.amountMinor.toLocaleString()} · {e.kind}
                </span>
                <span className="text-slate-600">{new Date(e.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/dex/buy" className="rounded-lg bg-violet-600 px-3 py-1.5 font-medium text-white hover:bg-violet-500">
          Buy crypto
        </Link>
        <Link href="/dex/amm" className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-300 hover:bg-white/5">
          Swap
        </Link>
        <Link href="/dex/offramp" className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-300 hover:bg-white/5">
          Withdraw
        </Link>
        <Link href="/student/card" className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-300 hover:bg-white/5">
          Fund card
        </Link>
      </div>
    </div>
  );
}

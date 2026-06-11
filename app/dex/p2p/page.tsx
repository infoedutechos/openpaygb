"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type P2pPayload = {
  policy: { phase: number; autonomous: boolean; pending: string[] };
  offers: Array<{
    id: string;
    side: string;
    asset: string;
    amount: number;
    priceUgxPerUnit: number;
    totalUgx: number;
  }>;
  note: string;
};

export default function DexP2pPage() {
  const [data, setData] = useState<P2pPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/public/dex/p2p");
        if (!r.ok) throw new Error("Could not load P2P book");
        setData((await r.json()) as P2pPayload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">P2P market</h1>
      <p className="mt-2 text-sm text-slate-400">
        Autonomous peer offers with minimal platform intervention. Escrow settlement is Phase 3.
      </p>
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      {data ? (
        <>
          <p className="mt-4 text-xs text-slate-500">{data.note}</p>
          <ul className="mt-4 space-y-3">
            {data.offers.map((o) => (
              <li key={o.id} className="rounded-xl border border-white/10 p-4 text-sm">
                <p className="font-medium text-white">
                  {o.side.toUpperCase()} {o.amount} {o.asset}
                </p>
                <p className="mt-1 text-slate-400">
                  @ UGX {o.priceUgxPerUnit.toLocaleString()} · total UGX {o.totalUgx.toLocaleString()}
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-500"
                >
                  Escrow (Phase 3)
                </button>
              </li>
            ))}
          </ul>
          <Link href="/dex/buy" className="mt-6 inline-block text-sm text-cyan-300 underline">
            Buy crypto now via fiat wizard →
          </Link>
        </>
      ) : null}
    </div>
  );
}

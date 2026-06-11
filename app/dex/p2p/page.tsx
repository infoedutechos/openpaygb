"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type Offer = {
  id: string;
  side: string;
  asset: string;
  amount: number;
  priceUgxPerUnit: number;
  totalUgx: number;
};

type P2pPayload = {
  policy: { phase: number; shipped: string[] };
  offers: Offer[];
  note: string;
};

export default function DexP2pPage() {
  const [data, setData] = useState<P2pPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/public/dex/p2p");
      if (!r.ok) throw new Error("Could not load P2P book");
      setData((await r.json()) as P2pPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function acceptEscrow(offerId: string) {
    setBusyId(offerId);
    setError(null);
    setMsg(null);
    try {
      const r = await fetch("/api/student/dex/p2p/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ offerId }),
      });
      const parsed = await readJsonResponse<{ message?: string; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setMsg(parsed.data.message ?? "Escrow held");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Escrow failed — sign in and fund OPGB");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">P2P market</h1>
      <p className="mt-2 text-sm text-slate-400">
        Autonomous peer offers — accept with OPGB escrow (1 OPGB = 1 UGX).
      </p>
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      {msg ? <p className="mt-4 text-sm text-emerald-300">{msg}</p> : null}
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
                  disabled={busyId === o.id}
                  onClick={() => void acceptEscrow(o.id)}
                  className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {busyId === o.id ? "Holding…" : "Accept & hold escrow"}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            <Link href="/student/login" className="text-cyan-300 underline">
              Student sign-in
            </Link>{" "}
            required · OPGB balance from card top-ups or wallet
          </p>
        </>
      ) : null}
    </div>
  );
}

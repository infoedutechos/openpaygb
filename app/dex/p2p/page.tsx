"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DexPageBack } from "@/components/dex/DexPageBack";
import { clientFetchErrorMessage } from "@/lib/client-fetch-error";
import { readJsonResponse } from "@/utils/read-json-response";
import { fetchJson } from "@/utils/fetch-json";

const P2P_API = "/api/openpay/dex/p2p";

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

type EscrowRow = {
  id: string;
  status: string;
  amountUgx: number;
  autoReleaseAt?: string;
  offer: { asset: string; amount: number; makerStudentId: string | null };
  dispute?: { id: string; status: string } | null;
};

export default function DexP2pPage() {
  const [data, setData] = useState<P2pPayload | null>(null);
  const [escrows, setEscrows] = useState<EscrowRow[]>([]);
  const [actor, setActor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetchJson("/api/public/dex/p2p");
      if (!r.ok) throw new Error("Could not load P2P book");
      setData((await r.json()) as P2pPayload);
      const er = await fetch(`${P2P_API}/escrows`, { credentials: "include" });
      if (er.ok) {
        const ej = (await er.json()) as { escrows?: EscrowRow[]; actor?: string };
        setEscrows(ej.escrows ?? []);
        setActor(ej.actor ?? null);
      } else {
        setEscrows([]);
        setActor(null);
      }
    } catch (e) {
      setError(clientFetchErrorMessage(e, "Could not load P2P book. Wait for dev Ready, then refresh."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function escrowAction(path: string, escrowId: string, body?: Record<string, string>) {
    setBusyId(escrowId);
    setError(null);
    setMsg(null);
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ escrowId, ...body }),
      });
      const parsed = await readJsonResponse<{ message?: string; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setMsg(parsed.data.message ?? "Done");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function acceptEscrow(offerId: string) {
    setBusyId(offerId);
    setError(null);
    setMsg(null);
    try {
      const r = await fetch(`${P2P_API}/escrow`, {
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
      <DexPageBack />
      <h1 className="text-2xl font-semibold text-white">P2P market</h1>
      <p className="mt-2 text-sm text-slate-400">
        Autonomous peer offers — accept with OPGB escrow (1 OPGB = 1 UGX). Open to every OpenPayGB card holder.
      </p>
      {actor ? (
        <p className="mt-2 text-xs text-emerald-300/90">Signed in as {actor} card holder</p>
      ) : null}
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
          {escrows.length > 0 ? (
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your escrows</p>
              <ul className="mt-3 space-y-3">
                {escrows.map((e) => (
                  <li key={e.id} className="rounded-xl border border-white/10 p-3 text-xs">
                    <p className="text-slate-200">
                      {e.status} · UGX {e.amountUgx.toLocaleString()} · {e.offer.amount} {e.offer.asset}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {e.status === "held" ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === e.id}
                            onClick={() => void escrowAction(`${P2P_API}/escrow/release`, e.id)}
                            className="rounded bg-emerald-700 px-2 py-1 text-white disabled:opacity-50"
                          >
                            Release
                          </button>
                          <button
                            type="button"
                            disabled={busyId === e.id}
                            onClick={() => void escrowAction(`${P2P_API}/escrow/cancel`, e.id)}
                            className="rounded bg-slate-700 px-2 py-1 text-white disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={busyId === e.id}
                            onClick={() =>
                              void escrowAction(`${P2P_API}/dispute`, e.id, {
                                reason: "Delivery issue — escalate to platform",
                              })
                            }
                            className="rounded bg-amber-800 px-2 py-1 text-white disabled:opacity-50"
                          >
                            Dispute
                          </button>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-4 space-y-2 text-xs text-slate-500">
            <p>Auto-release after 24h · OPGB from card top-ups (TON or Mobile Money).</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              <Link href="/student/login" className="text-cyan-300 underline">
                Student
              </Link>
              <Link href="/admin/login" className="text-cyan-300 underline">
                Admin
              </Link>
              <Link href="/staff/login" className="text-cyan-300 underline">
                Staff
              </Link>
              <Link href="/developers/register" className="text-cyan-300 underline">
                Developer
              </Link>
              <Link href="/card/get" className="text-cyan-300 underline">
                Get a card
              </Link>
              <Link href="/dex/p2p" className="text-cyan-300 underline">
                P2P
              </Link>
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

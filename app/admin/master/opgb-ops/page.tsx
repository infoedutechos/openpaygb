"use client";

import { useCallback, useEffect, useState } from "react";

type DisputeRow = {
  id: string;
  status: string;
  reason: string;
  escalatedBy: string;
  createdAt: string;
  escrow: {
    id: string;
    status: string;
    amountUgx: number;
    takerStudentId: string;
    referenceKey: string;
    offer: {
      id: string;
      side: string;
      asset: string;
      amount: number;
      priceUgxPerUnit: number;
      makerStudentId: string | null;
    };
  };
};

type WithdrawRow = {
  id: string;
  studentId: string;
  asset: string;
  amount: number;
  amountUgx: number;
  rail: string;
  destination: string;
  status: string;
  referenceKey: string;
  memo: string;
  createdAt: string;
};

export default function MasterOpgbOpsPage() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [withdraws, setWithdraws] = useState<WithdrawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dRes, wRes] = await Promise.all([
        fetch("/api/master/dex-p2p-disputes"),
        fetch("/api/master/opgb-withdraws"),
      ]);
      const dData = await dRes.json();
      const wData = await wRes.json();
      if (!dRes.ok) throw new Error(dData.error || "Failed to load disputes");
      if (!wRes.ok) throw new Error(wData.error || "Failed to load withdraws");
      setDisputes(dData.disputes ?? []);
      setWithdraws(wData.withdraws ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ops queues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolveDispute = async (disputeId: string, resolution: "release" | "refund") => {
    setBusyId(disputeId);
    setError(null);
    try {
      const res = await fetch("/api/master/dex-p2p-disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disputeId, resolution, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resolve failed");
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setBusyId(null);
    }
  };

  const actWithdraw = async (requestId: string, action: "complete" | "reject") => {
    setBusyId(requestId);
    setError(null);
    try {
      const res = await fetch("/api/master/opgb-withdraws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">OPGB ops</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Resolve P2P escrow disputes and process custodial withdraw requests. Live MoMo/bank/TON
          disbursement still needs provider payout credentials — until then, mark complete only after
          you send funds externally, or reject to restore the student balance.
        </p>
      </header>

      <label className="block max-w-xl">
        <span className="text-xs uppercase tracking-wide text-slate-500">Ops note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-white"
          placeholder="Reference / reason for audit trail"
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-slate-400">Loading queues…</p> : null}

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-amber-100">
          Open P2P disputes <span className="text-slate-500">({disputes.length})</span>
        </h2>
        {disputes.length === 0 && !loading ? (
          <p className="text-sm text-slate-500">No open disputes.</p>
        ) : null}
        <ul className="space-y-3">
          {disputes.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {d.escrow.offer.amount} {d.escrow.offer.asset} · UGX{" "}
                    {d.escrow.amountUgx.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{d.reason}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Escrow {d.escrow.referenceKey} · {new Date(d.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => void resolveDispute(d.id, "release")}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Release to parties
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => void resolveDispute(d.id, "refund")}
                    className="rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs font-semibold text-amber-100 hover:border-amber-400/60 disabled:opacity-50"
                  >
                    Refund buyer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-cyan-100">
          Withdraw queue <span className="text-slate-500">({withdraws.length})</span>
        </h2>
        {withdraws.length === 0 && !loading ? (
          <p className="text-sm text-slate-500">No pending withdraws.</p>
        ) : null}
        <ul className="space-y-3">
          {withdraws.map((w) => (
            <li
              key={w.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {w.amount} {w.asset.toUpperCase()} via {w.rail} → {w.destination}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    UGX {w.amountUgx.toLocaleString()} · {w.status} · student {w.studentId.slice(-6)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {w.referenceKey} · {new Date(w.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === w.id}
                    onClick={() => void actWithdraw(w.id, "complete")}
                    className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                  >
                    Mark paid
                  </button>
                  <button
                    type="button"
                    disabled={busyId === w.id}
                    onClick={() => void actWithdraw(w.id, "reject")}
                    className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-100 hover:border-rose-400/60 disabled:opacity-50"
                  >
                    Reject + restore
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

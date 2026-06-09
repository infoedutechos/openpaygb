"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type RequestRow = {
  id: string;
  organizationName: string;
  amountUgx: number;
  memo: string;
  payUrl: string;
  expiresAt: string;
};

export function PaymentRequestPanel() {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [programmeCode, setProgrammeCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/payment-requests", { credentials: "include" });
    const parsed = await readJsonResponse<{ requests?: RequestRow[] }>(r);
    if (parsed.ok && parsed.data.requests) setRows(parsed.data.requests);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setLastUrl(null);
    try {
      const amountUgx = parseInt(amount.replace(/\D/g, ""), 10);
      if (!amountUgx || amountUgx <= 0) throw new Error("Enter a valid UGX amount");
      const r = await fetch("/api/admin/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amountUgx,
          memo: memo.trim() || undefined,
          programmeCode: programmeCode.trim() || undefined,
        }),
      });
      const parsed = await readJsonResponse<{ request?: { payUrl: string } }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setLastUrl(parsed.data.request?.payUrl ?? null);
      setAmount("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-cyan-500/20 bg-[var(--card)] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-400/90">Request money</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Payment request links</h2>
      <p className="mt-2 text-sm text-slate-400">
        Create a shareable link so payers can receive and complete tuition checkout (request → receive).
      </p>

      <form onSubmit={(e) => void createLink(e)} className="mt-4 grid gap-3 sm:max-w-md">
        <label className="block text-sm">
          <span className="text-slate-400">Amount (UGX)</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
            inputMode="numeric"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Memo (optional)</span>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Programme code (optional)</span>
          <input
            value={programmeCode}
            onChange={(e) => setProgrammeCode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {lastUrl ? (
          <p className="break-all text-sm text-emerald-300">
            Link created:{" "}
            <a href={lastUrl} className="underline">
              {lastUrl}
            </a>
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create payment link"}
        </button>
      </form>

      {rows.length > 0 ? (
        <ul className="mt-6 space-y-2 text-sm">
          {rows.slice(0, 8).map((r) => (
            <li key={r.id} className="rounded-lg border border-white/10 px-3 py-2">
              <p className="font-medium text-white">
                UGX {r.amountUgx.toLocaleString()} · {r.organizationName}
              </p>
              {r.memo ? <p className="text-slate-400">{r.memo}</p> : null}
              <a href={r.payUrl} className="text-cyan-300 underline">
                {r.payUrl}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

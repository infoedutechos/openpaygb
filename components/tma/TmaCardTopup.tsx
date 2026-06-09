"use client";

import { useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type Props = {
  onDone?: () => void;
};

export function TmaCardTopup({ onDone }: Props) {
  const [amount, setAmount] = useState("50000");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function topUp() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const amountUgx = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amountUgx || amountUgx < 1000) {
      setErr("Minimum top-up is UGX 1,000");
      setBusy(false);
      return;
    }
    try {
      const r = await fetch("/api/student/openpay-card/fund/momo-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amountUgx,
          rail: "livepay",
          phone: phone.trim(),
        }),
      });
      const parsed = await readJsonResponse<{ message?: string; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setMsg(parsed.data.message ?? "Check your phone to approve the top-up.");
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Top-up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wider opacity-60">Top up via mobile money</p>
      <input
        type="text"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount UGX"
        className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="2567XXXXXXXX"
        className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
      />
      {err ? <p className="text-xs text-rose-300">{err}</p> : null}
      {msg ? <p className="text-xs text-emerald-300">{msg}</p> : null}
      <button type="button" className="tma-btn-secondary tma-btn text-sm" disabled={busy} onClick={() => void topUp()}>
        {busy ? "Starting…" : "Top up"}
      </button>
    </div>
  );
}

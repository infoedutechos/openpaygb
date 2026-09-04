"use client";

import { useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type Props = {
  onDone?: () => void;
};

export function TmaCardTopup({ onDone }: Props) {
  const [amount, setAmount] = useState("50000");
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState<"mtn" | "airtel">("mtn");
  const [rail, setRail] = useState<string>("sandbox");
  const [sandbox, setSandbox] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/public/openpay-card-momo-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { preferredRail?: string | null; sandbox?: boolean } | null) => {
        if (!j) return;
        setSandbox(Boolean(j.sandbox));
        if (j.preferredRail) setRail(j.preferredRail);
      })
      .catch(() => undefined);
  }, []);

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
    if (!phone.trim()) {
      setErr("Enter your Mobile Money number");
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
          rail,
          phone: phone.trim(),
          network: rail === "livepay" || rail === "sandbox" ? network : undefined,
        }),
      });
      const parsed = await readJsonResponse<{ message?: string; error?: string; sandbox?: boolean }>(r);
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
      {sandbox ? (
        <p className="text-[11px] text-amber-200/90">Sandbox MoMo — credits instantly (no live PSP keys).</p>
      ) : null}
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
        placeholder="07XXXXXXXXX"
        className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
      />
      <select
        value={network}
        onChange={(e) => setNetwork(e.target.value as "mtn" | "airtel")}
        className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
      >
        <option value="mtn">MTN</option>
        <option value="airtel">Airtel</option>
      </select>
      {err ? <p className="text-xs text-rose-300">{err}</p> : null}
      {msg ? <p className="text-xs text-emerald-300">{msg}</p> : null}
      <button type="button" className="tma-btn-secondary tma-btn text-sm" disabled={busy} onClick={() => void topUp()}>
        {busy ? "Starting…" : "Top up"}
      </button>
    </div>
  );
}

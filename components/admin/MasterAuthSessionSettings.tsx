"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type Policy = {
  adminSessionHours: number;
  adminRememberDays: number;
  studentSessionDays: number;
  checkoutSessionHours: number;
  pendingPaymentTtlHours: number;
  adminManualPaymentConfirm: boolean;
};

const DEFAULTS: Policy = {
  adminSessionHours: 8,
  adminRememberDays: 30,
  studentSessionDays: 7,
  checkoutSessionHours: 24,
  pendingPaymentTtlHours: 48,
  adminManualPaymentConfirm: true,
};

export function MasterAuthSessionSettings() {
  const [policy, setPolicy] = useState<Policy>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/master/platform-auth-policy", { credentials: "include" });
    const parsed = await readJsonResponse<{ policy: Policy }>(r);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setPolicy(parsed.data.policy);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch("/api/master/platform-auth-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(policy),
      });
      const parsed = await readJsonResponse<{ policy: Policy }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setPolicy(parsed.data.policy);
      setSaved("Auth & session policy saved — applies to new sign-ins and pending-payment expiry.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function num(key: keyof Policy, label: string, hint?: string) {
    return (
      <label className="block text-xs text-slate-500">
        {label}
        <input
          type="number"
          value={Number(policy[key])}
          onChange={(e) =>
            setPolicy((p) => ({ ...p, [key]: Number(e.target.value) }))
          }
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
        />
        {hint ? <span className="mt-1 block text-[11px] text-slate-600">{hint}</span> : null}
      </label>
    );
  }

  return (
    <section
      id="auth-session-policy"
      className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-amber-100">Auth & session policy</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Session lifetimes and pending-payment TTL for the whole platform. Manual payment confirm is
            the admin override for edge cases (TON/MoMo still auto-confirm via cron/webhooks).
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save policy"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">{error}</p>
      ) : null}
      {saved ? (
        <p className="mt-4 rounded-lg border border-amber-500/35 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">{saved}</p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {num("adminSessionHours", "Admin session (hours)", "Default sign-in without Remember me")}
        {num("adminRememberDays", "Admin remember-me (days)")}
        {num("studentSessionDays", "Student portal session (days)")}
        {num("checkoutSessionHours", "Guest checkout session (hours)")}
        {num("pendingPaymentTtlHours", "Pending payment TTL (hours)")}
        <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={policy.adminManualPaymentConfirm}
            onChange={(e) =>
              setPolicy((p) => ({ ...p, adminManualPaymentConfirm: e.target.checked }))
            }
            className="h-4 w-4"
          />
          Allow admin manual payment confirm
        </label>
      </div>
    </section>
  );
}

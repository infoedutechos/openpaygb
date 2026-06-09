"use client";

import { useCallback, useEffect, useState } from "react";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";
import { fetchJson } from "@/utils/fetch-json";
import { readJsonResponse } from "@/utils/read-json-response";

type Settings = {
  enabled: boolean;
  guestCardEnabled: boolean;
  issueFeeTon: number;
};

export function MasterOpenPayCardSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [guestCardEnabled, setGuestCardEnabled] = useState(true);
  const [feeDraft, setFeeDraft] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetchJson("/api/master/openpay-card-settings", { credentials: "include" });
      const parsed = await readJsonResponse<Settings>(r);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      setSettings(parsed.data);
      setEnabled(parsed.data.enabled);
      setFeeDraft(String(parsed.data.issueFeeTon));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load card settings");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fee = parseFloat(feeDraft.trim().replace(",", "."));
      if (Number.isNaN(fee) || fee <= 0) {
        throw new Error("Enter a positive TON issue fee (e.g. 5).");
      }
      const r = await fetch("/api/master/openpay-card-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled, guestCardEnabled, issueFeeTon: fee }),
      });
      const parsed = await readJsonResponse<Settings>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setSettings(parsed.data);
      setEnabled(parsed.data.enabled);
      setFeeDraft(String(parsed.data.issueFeeTon));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-violet-500/25 bg-[var(--card)] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-400/90">Platform card</p>
      <h2 className="mt-2 text-lg font-semibold text-white">{OPEN_PAY_BRAND} virtual card</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Students may opt in to a closed-loop platform card (UGX balance). Issuance is paid in TON or MoMo; tuition can be
        paid from the card balance when enabled. See <code className="text-slate-500">docs/OPENPAYGB_PLATFORM_CARD.md</code>{" "}
        for all user-category benefits.
      </p>

      <form onSubmit={(e) => void save(e)} className="mt-6 space-y-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black/40"
          />
          Offer OpenPayGB card to students
        </label>

        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={guestCardEnabled}
            onChange={(e) => setGuestCardEnabled(e.target.checked)}
            disabled={!enabled}
            className="h-4 w-4 rounded border-white/20 bg-black/40"
          />
          Allow guest card registration (email + phone OTP at /card/get)
        </label>

        <div>
          <label className="text-[11px] text-slate-500">Card issue fee (TON)</label>
          <input
            type="text"
            inputMode="decimal"
            value={feeDraft}
            onChange={(e) => setFeeDraft(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
          />
          <p className="mt-1 text-[11px] text-slate-600">
            Default is 5 TON. Applies to new activations; existing pending cards keep their quoted fee until re-issued.
          </p>
        </div>

        {settings ? (
          <p className="text-xs text-slate-600">
            Saved: {settings.enabled ? "enabled" : "disabled"} · {settings.issueFeeTon} TON issue fee
          </p>
        ) : null}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save card settings"}
        </button>
      </form>
    </section>
  );
}

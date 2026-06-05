"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type FeeKind = "env" | "fixed_ugx" | "percent";

type FeeMeta = {
  checkoutPlatformFeeDefaultKind: FeeKind;
  checkoutPlatformFeeDefaultUgx: number;
  checkoutPlatformFeeDefaultPercent: number;
  ruleDescription: string;
  previewSubtotalUgx: number;
  envFallbackUgx: number;
  effectiveDefaultUgx: number;
};

export function MasterPlatformCheckoutFeeSettings() {
  const [kind, setKind] = useState<FeeKind>("env");
  const [ugxDraft, setUgxDraft] = useState("0");
  const [percentDraft, setPercentDraft] = useState("3");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<FeeMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/master/platform-checkout-fee", { credentials: "include" });
    const parsed = await readJsonResponse<FeeMeta>(r);
    if (!parsed.ok) return;
    setMeta(parsed.data);
    setKind(parsed.data.checkoutPlatformFeeDefaultKind);
    setUgxDraft(String(parsed.data.checkoutPlatformFeeDefaultUgx));
    setPercentDraft(String(parsed.data.checkoutPlatformFeeDefaultPercent));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { checkoutPlatformFeeDefaultKind: kind };
      if (kind === "fixed_ugx") {
        const n = parseInt(ugxDraft.trim(), 10);
        if (Number.isNaN(n) || n < 0) throw new Error("Enter a fixed UGX amount (0 or higher).");
        body.checkoutPlatformFeeDefaultUgx = n;
      } else if (kind === "percent") {
        const p = parseFloat(percentDraft.trim().replace(",", "."));
        if (Number.isNaN(p) || p < 0 || p > 100) throw new Error("Enter a percentage between 0 and 100.");
        body.checkoutPlatformFeeDefaultPercent = p;
        body.checkoutPlatformFeeDefaultUgx = -1;
      } else {
        body.checkoutPlatformFeeDefaultUgx = -1;
        body.checkoutPlatformFeeDefaultPercent = 0;
      }

      const r = await fetch("/api/master/platform-checkout-fee", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const parsed = await readJsonResponse<FeeMeta>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setMeta(parsed.data);
      setKind(parsed.data.checkoutPlatformFeeDefaultKind);
      setUgxDraft(String(parsed.data.checkoutPlatformFeeDefaultUgx));
      setPercentDraft(String(parsed.data.checkoutPlatformFeeDefaultPercent));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="platform-processing-fee"
      className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-5 shadow-[0_0_0_1px_rgba(245,158,11,0.06)]"
    >
      <h2 className="text-sm font-semibold text-amber-100">Default transaction / processing charge</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
        Platform-wide default for schools that <strong className="font-medium text-slate-300">inherit</strong> (
        <code className="rounded bg-black/35 px-1 text-cyan-200/90">-1</code> on the org row). Choose{" "}
        <strong className="text-slate-300">environment fixed UGX</strong>, a{" "}
        <strong className="text-slate-300">fixed UGX</strong> amount, or a{" "}
        <strong className="text-slate-300">percentage</strong> of the tuition subtotal (e.g. 3% on UGX 1,000,000 → UGX
        30,000). Per-school overrides are on <span className="text-slate-500">Manager → Organizations</span>.
      </p>

      {meta ? (
        <p className="mt-3 text-xs text-slate-500">
          <span className="text-slate-400">Active rule:</span>{" "}
          <strong className="text-white">{meta.ruleDescription}</strong>
          {" · "}
          <span className="text-slate-600">Preview on UGX {meta.previewSubtotalUgx.toLocaleString()} subtotal:</span>{" "}
          <strong className="tabular-nums text-white">UGX {meta.effectiveDefaultUgx.toLocaleString()}</strong>
          {meta.checkoutPlatformFeeDefaultKind === "env" ? (
            <>
              {" · "}
              <span className="text-slate-600">Env:</span>{" "}
              <span className="tabular-nums text-slate-400">UGX {meta.envFallbackUgx.toLocaleString()}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

      <form onSubmit={(e) => void save(e)} className="mt-4 space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-[11px] font-medium text-slate-500">Charge type</legend>
          <div className="flex flex-wrap gap-4 text-sm text-slate-300">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="fee-kind"
                checked={kind === "env"}
                onChange={() => setKind("env")}
                className="border-slate-600"
              />
              Use env only
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="fee-kind"
                checked={kind === "fixed_ugx"}
                onChange={() => setKind("fixed_ugx")}
                className="border-slate-600"
              />
              Fixed UGX
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="fee-kind"
                checked={kind === "percent"}
                onChange={() => setKind("percent")}
                className="border-slate-600"
              />
              Percent of subtotal
            </label>
          </div>
        </fieldset>

        {kind === "env" ? (
          <p className="text-xs text-slate-500">
            Uses <code className="rounded bg-black/30 px-1">CHECKOUT_PLATFORM_FEE_UGX</code> from deployment env (flat UGX,
            not a percentage).
          </p>
        ) : null}

        {kind === "fixed_ugx" ? (
          <div>
            <label htmlFor="platform-fee-ugx" className="text-[11px] font-medium text-slate-500">
              Fixed amount (UGX)
            </label>
            <input
              id="platform-fee-ugx"
              type="number"
              min={0}
              step={1}
              value={ugxDraft}
              onChange={(e) => setUgxDraft(e.target.value)}
              className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </div>
        ) : null}

        {kind === "percent" ? (
          <div>
            <label htmlFor="platform-fee-percent" className="text-[11px] font-medium text-slate-500">
              Percentage (%)
            </label>
            <div className="mt-1 flex max-w-xs items-center gap-2">
              <input
                id="platform-fee-percent"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={percentDraft}
                onChange={(e) => setPercentDraft(e.target.value)}
                className="block w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600">
              Applied to tuition subtotal per installment slice (not a flat env value).
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save default"}
        </button>
      </form>
    </section>
  );
}

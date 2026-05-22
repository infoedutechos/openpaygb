"use client";

import { useCallback, useEffect, useState } from "react";
import { formatFxRateSource } from "@/lib/fx-rate-label";

type LiveCombined = {
  ugxPerTon: number;
  source: string;
  fetchedAt: string;
};

type MasterFxApi = {
  fresh: boolean;
  envDefaultUgx: number;
  platform: {
    fxOverrideKind: string;
    fxOverrideUgxPerTon: number | null;
    fxOverrideBufferPct: number;
  };
  live: {
    providers: { source: string; ugxPerTon: number }[];
    combined: LiveCombined | null;
  };
  defaultOrganization: { id: string; slug: string };
  effectiveSample: {
    ugxPerTon: number;
    source: string;
    effectiveScope: string;
    effectiveKind: string;
  };
  platformPreview: {
    ugxPerTon: number;
    source: string;
    effectiveScope: string;
    effectiveKind: string;
  };
};

type PlatformKind = "none" | "fixed" | "buffer_pct";

export function MasterFxSettings() {
  const [data, setData] = useState<MasterFxApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [kind, setKind] = useState<PlatformKind>("none");
  const [ugxDraft, setUgxDraft] = useState("");
  const [bufferDraft, setBufferDraft] = useState("0");

  const load = useCallback(async (fresh = false) => {
    setError(null);
    if (fresh) setRefreshing(true);
    try {
      const url = fresh ? "/api/master/fx?fresh=1" : "/api/master/fx";
      const r = await fetch(url, { credentials: "include" });
      const j = (await r.json()) as MasterFxApi & { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not load FX");
      setData(j);
      const pk = j.platform.fxOverrideKind;
      setKind((pk === "fixed" || pk === "buffer_pct" || pk === "none" ? pk : "none") as PlatformKind);
      setUgxDraft(j.platform.fxOverrideUgxPerTon ? String(j.platform.fxOverrideUgxPerTon) : "");
      setBufferDraft(String(j.platform.fxOverrideBufferPct ?? 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setRefreshing(false);
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
      const body: Record<string, unknown> = { fxOverrideKind: kind };
      if (kind === "fixed") {
        const n = parseInt(ugxDraft.replace(/\s/g, ""), 10);
        if (!n || n <= 0) throw new Error("Enter a positive UGX per 1 TON for fixed override.");
        body.fxOverrideUgxPerTon = n;
        body.fxOverrideBufferPct = parseFloat(bufferDraft) || 0;
      } else if (kind === "buffer_pct") {
        const pct = parseFloat(bufferDraft);
        if (!Number.isFinite(pct)) throw new Error("Enter a numeric buffer %.");
        body.fxOverrideUgxPerTon = null;
        body.fxOverrideBufferPct = pct;
      } else {
        body.fxOverrideUgxPerTon = null;
        body.fxOverrideBufferPct = 0;
      }
      const r = await fetch("/api/master/fx", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Save failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function clearOverride() {
    setKind("none");
    setUgxDraft("");
    setBufferDraft("0");
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/master/fx", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fxOverrideKind: "none", fxOverrideUgxPerTon: null, fxOverrideBufferPct: 0 }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Clear failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) {
    return <p className="text-sm text-slate-500">Loading TON/UGX rates…</p>;
  }

  const live = data?.live.combined;
  const providers = data?.live.providers ?? [];

  return (
    <section
      id="ton-ugx-rate"
      className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.06)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-cyan-100">TON / UGX exchange rate</h2>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
            Checkout quotes use the <strong className="font-medium text-slate-300">live market median</strong> from
            multiple providers unless you set a platform-wide or per-school override. School overrides take precedence
            over the platform default.
          </p>
        </div>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void load(true)}
          className="rounded-lg border border-cyan-500/35 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-950/50 disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh live"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

      {data ? (
        <>
          <p className="mt-2 text-[11px] text-slate-600">
            Default org for sampling:{" "}
            <span className="font-mono text-slate-400">{data.defaultOrganization.slug}</span>
            {data.fresh ? null : (
              <span className="text-slate-600"> · Provider breakdown loads when you use Refresh live.</span>
            )}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">Live market (cached)</p>
              {live ? (
                <>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                    1 TON ≈ UGX {live.ugxPerTon.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatFxRateSource(live.source)}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Live fetch unavailable (check FX_LIVE_ENABLED).</p>
              )}
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/80">Platform rule only</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                1 TON ≈ UGX {data.platformPreview.ugxPerTon.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">{formatFxRateSource(data.platformPreview.source)}</p>
              <p className="mt-2 text-[11px] text-slate-600">
                Default org checkout: UGX {data.effectiveSample.ugxPerTon.toLocaleString()} (
                {formatFxRateSource(data.effectiveSample.source)}) · scope {data.effectiveSample.effectiveScope} ·{" "}
                {data.effectiveSample.effectiveKind}
              </p>
            </div>
          </div>

          {providers.length > 0 ? (
            <>
            <div className="mt-4 space-y-2 md:hidden">
              {providers.map((p) => (
                <div
                  key={p.source}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300"
                >
                  <span>{formatFxRateSource(p.source)}</span>
                  <span className="font-mono tabular-nums">{p.ugxPerTon.toLocaleString()} UGX</span>
                </div>
              ))}
            </div>
            <div className="mt-4 hidden overflow-x-auto rounded-lg border border-white/10 md:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500">
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2 text-right">UGX / TON</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.source} className="border-b border-white/5 text-slate-300">
                      <td className="px-3 py-2">{formatFxRateSource(p.source)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{p.ugxPerTon.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : null}

          <form onSubmit={save} className="mt-5 space-y-4 border-t border-white/10 pt-5">
            <p className="text-xs font-semibold text-cyan-100">Platform-wide override</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Platform FX override mode">
              {(
                [
                  ["none", "Live median"],
                  ["fixed", "Fixed UGX/TON"],
                  ["buffer_pct", "% buffer on median"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  disabled={busy}
                  onClick={() => setKind(k)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                    kind === k ? "border-cyan-400/60 bg-cyan-950/40 text-cyan-50" : "border-white/10 text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {kind === "fixed" ? (
              <div>
                <label className="text-[11px] text-slate-500">UGX per 1 TON</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={ugxDraft}
                  onChange={(e) => setUgxDraft(e.target.value)}
                  className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
                />
              </div>
            ) : null}

            {kind === "buffer_pct" ? (
              <div>
                <label className="text-[11px] text-slate-500">Buffer % on live median (e.g. 2.5 = +2.5%)</label>
                <input
                  type="number"
                  step={0.1}
                  min={-50}
                  max={50}
                  value={bufferDraft}
                  onChange={(e) => setBufferDraft(e.target.value)}
                  className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-500 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save platform override"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void clearOverride()}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                Clear (use live)
              </button>
            </div>
          </form>

          <p className="mt-3 text-[11px] text-slate-600">
            Per-school overrides:{" "}
            <a href="/admin/master/organizations#fx-overrides" className="text-cyan-300/90 underline hover:text-cyan-200">
              Manager → Organizations
            </a>
            . Env fallback when live is down: UGX {data.envDefaultUgx.toLocaleString()}.
          </p>
        </>
      ) : null}
    </section>
  );
}

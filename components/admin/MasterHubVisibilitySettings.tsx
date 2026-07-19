"use client";

import { useEffect, useState } from "react";
import type { HubKey } from "@/lib/ecosystem/hubs";
import { HUBS } from "@/lib/ecosystem/hubs";
import { readJsonResponse } from "@/utils/read-json-response";

type HubVisibilityPayload = Record<HubKey, boolean>;

const HUB_ORDER: HubKey[] = ["tuition", "play", "dex", "developers"];

export function MasterHubVisibilitySettings() {
  const [state, setState] = useState<HubVisibilityPayload | null>(null);
  const [busy, setBusy] = useState<HubKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetch("/api/master/hub-visibility", { credentials: "include" });
      const parsed = await readJsonResponse<HubVisibilityPayload>(r);
      if (!cancelled && parsed.ok) setState(parsed.data);
      if (!cancelled && !parsed.ok) setError(parsed.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(hub: HubKey) {
    if (!state) return;
    const next = !state[hub];
    setBusy(hub);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch("/api/master/hub-visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [hub]: next }),
      });
      const parsed = await readJsonResponse<HubVisibilityPayload>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setState(parsed.data);
      setSaved(
        next
          ? `${HUBS[hub].label} is now hidden — removed from public switchers and its routes redirect home.`
          : `${HUBS[hub].label} is visible again.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      id="hub-visibility"
      className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-5 shadow-[0_0_0_1px_rgba(245,158,11,0.06)]"
    >
      <h2 className="text-sm font-semibold text-amber-100">Hub visibility (hide)</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">
        Hide ON removes a hub completely from the public site (home switcher, CTAs, and cross-links). Direct visits to
        that hub&apos;s routes redirect to home. Hide OFF brings it back. Separate from{" "}
        <a href="#hub-maintenance" className="text-amber-200/90 underline-offset-2 hover:underline">
          Hub maintenance
        </a>
        , which keeps the hub listed but shows a maintenance screen.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {HUB_ORDER.map((hub) => {
          const hidden = state?.[hub] === true;
          const loading = busy === hub;
          return (
            <button
              key={hub}
              type="button"
              disabled={state === null || loading}
              onClick={() => void toggle(hub)}
              className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors sm:min-w-[220px] sm:flex-none ${
                hidden
                  ? "border-amber-400/50 bg-amber-600/25 text-amber-50 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]"
                  : "border-white/12 bg-black/20 text-slate-300 hover:border-white/25 hover:bg-black/30"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {loading
                ? "Saving…"
                : hidden
                  ? `Hide ${HUBS[hub].shortLabel} — ON`
                  : `Hide ${HUBS[hub].shortLabel} — OFF`}
              {hidden ? (
                <span className="ml-2 rounded-full bg-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100">
                  Hidden
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-emerald-300/90">{saved}</p> : null}
    </section>
  );
}

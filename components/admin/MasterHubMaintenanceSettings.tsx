"use client";

import { useEffect, useState } from "react";
import type { HubKey } from "@/lib/ecosystem/hubs";
import { HUBS } from "@/lib/ecosystem/hubs";
import { readJsonResponse } from "@/utils/read-json-response";

type HubMaintenanceState = Record<HubKey, boolean>;

const HUB_ORDER: HubKey[] = ["tuition", "play", "dex"];

const BUTTON_LABEL: Record<HubKey, string> = {
  tuition: "Tuition is Under Maintenance",
  play: "Play is Under Maintenance",
  dex: "Dex is Under Maintenance",
  developers: "Developers is Under Maintenance",
};

export function MasterHubMaintenanceSettings() {
  const [state, setState] = useState<HubMaintenanceState | null>(null);
  const [busy, setBusy] = useState<HubKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetch("/api/master/hub-maintenance", { credentials: "include" });
      const parsed = await readJsonResponse<HubMaintenanceState>(r);
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
      const r = await fetch("/api/master/hub-maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [hub]: next }),
      });
      const parsed = await readJsonResponse<HubMaintenanceState>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setState(parsed.data);
      setSaved(
        next
          ? `${HUBS[hub].label} is now under maintenance — public routes for that hub are blocked.`
          : `${HUBS[hub].label} is live again.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      id="hub-maintenance"
      className="rounded-xl border border-rose-500/25 bg-rose-950/15 p-5 shadow-[0_0_0_1px_rgba(244,63,94,0.06)]"
    >
      <h2 className="text-sm font-semibold text-rose-100">Hub maintenance</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">
        Toggle maintenance per hub. When enabled, guests see a maintenance screen on that hub&apos;s
        routes. Master admin and org admin consoles stay accessible.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {HUB_ORDER.map((hub) => {
          const active = state?.[hub] === true;
          const loading = busy === hub;
          return (
            <button
              key={hub}
              type="button"
              disabled={state === null || loading}
              onClick={() => void toggle(hub)}
              className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors sm:min-w-[220px] sm:flex-none ${
                active
                  ? "border-rose-400/50 bg-rose-600/25 text-rose-50 shadow-[0_0_0_1px_rgba(244,63,94,0.2)]"
                  : "border-white/12 bg-black/20 text-slate-300 hover:border-white/25 hover:bg-black/30"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {loading ? "Saving…" : BUTTON_LABEL[hub]}
              {active ? (
                <span className="ml-2 rounded-full bg-rose-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-100">
                  On
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

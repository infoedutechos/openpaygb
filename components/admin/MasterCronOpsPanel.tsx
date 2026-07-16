"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type CronJob = {
  id: string;
  path: string;
  schedule: string;
  scheduleLabel: string;
  description: string;
};

export function MasterCronOpsPanel() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [secretConfigured, setSecretConfigured] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await fetch("/api/master/cron-ops", { credentials: "include" });
    const parsed = await readJsonResponse<{ jobs: CronJob[]; secretConfigured: boolean }>(r);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setJobs(parsed.data.jobs ?? []);
    setSecretConfigured(Boolean(parsed.data.secretConfigured));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(jobId: string) {
    setBusyId(jobId);
    setError(null);
    setLastResult(null);
    try {
      const r = await fetch("/api/master/cron-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobId }),
      });
      const parsed = await readJsonResponse<{
        ok: boolean;
        status: number;
        elapsedMs: number;
        body: unknown;
        error?: string;
      }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setLastResult(
        `${jobId}: HTTP ${parsed.data.status} in ${parsed.data.elapsedMs}ms · ${JSON.stringify(parsed.data.body).slice(0, 240)}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section id="cron-ops" className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-950/15 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-fuchsia-100">Cron & ops</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Platform scheduled jobs (from <code className="text-xs">vercel.json</code>).{" "}
            {secretConfigured ? (
              <span className="text-emerald-300/90">CRON_SECRET is configured.</span>
            ) : (
              <span className="text-amber-300/90">CRON_SECRET missing — set it under Environment.</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-slate-200 hover:border-white/30"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">{error}</p>
      ) : null}
      {lastResult ? (
        <p className="mt-4 break-all rounded-lg border border-fuchsia-500/35 bg-fuchsia-950/40 px-3 py-2 text-xs text-fuchsia-100">
          {lastResult}
        </p>
      ) : null}

      <ul className="mt-5 space-y-3">
        {jobs.map((j) => (
          <li
            key={j.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <div>
              <p className="text-sm font-medium text-white">{j.id}</p>
              <p className="mt-1 text-xs text-slate-400">{j.description}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {j.scheduleLabel} · <code>{j.path}</code> · <code>{j.schedule}</code>
              </p>
            </div>
            <button
              type="button"
              disabled={!secretConfigured || busyId === j.id}
              onClick={() => void run(j.id)}
              className="rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
            >
              {busyId === j.id ? "Running…" : "Run now"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

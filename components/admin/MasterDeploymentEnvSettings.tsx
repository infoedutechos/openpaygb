"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readJsonResponse } from "@/utils/read-json-response";

type EnvVarRow = {
  name: string;
  label: string;
  description: string;
  sensitive: boolean;
  requirement: "always" | "production" | "optional";
  set: boolean;
  maskedPreview: string | null;
  missingInProduction: boolean;
};

type EnvGroup = {
  id: string;
  title: string;
  description: string;
  docsPath?: string;
  masterUiAnchor?: string;
  configured: boolean;
  healthy: boolean | null;
  healthNote: string | null;
  webhookUrl: string | null;
  vars: EnvVarRow[];
};

type DeploymentPayload = {
  summary: {
    production: boolean;
    appUrl: string | null;
    totalVars: number;
    setVars: number;
    missingProduction: number;
    groupsReady: number;
    groupsTotal: number;
  };
  groups: EnvGroup[];
  probedAt: string | null;
};

function requirementLabel(r: EnvVarRow["requirement"]): string {
  if (r === "always") return "Required";
  if (r === "production") return "Production";
  return "Optional";
}

function healthBadge(healthy: boolean | null) {
  if (healthy === true) {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
        Ready
      </span>
    );
  }
  if (healthy === false) {
    return (
      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-300">
        Action needed
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      Optional
    </span>
  );
}

export function MasterDeploymentEnvSettings() {
  const [data, setData] = useState<DeploymentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ core: true, livepay: true, relworx: true });
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async (probe = false) => {
    setError(null);
    const url = probe ? "/api/master/deployment-env?probe=1" : "/api/master/deployment-env";
    const r = await fetch(url, { credentials: "include" });
    const parsed = await readJsonResponse<DeploymentPayload>(r);
    if (!parsed.ok) throw new Error(parsed.error);
    setData(parsed.data);
  }, []);

  useEffect(() => {
    void load()
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [load]);

  const coveragePct = useMemo(() => {
    if (!data?.summary.totalVars) return 0;
    return Math.round((data.summary.setVars / data.summary.totalVars) * 100);
  }, [data]);

  async function runProbe() {
    setProbing(true);
    setError(null);
    try {
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Probe failed");
    } finally {
      setProbing(false);
    }
  }

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  function toggleGroup(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <section
      id="deployment-environment"
      className="rounded-xl border border-indigo-500/25 bg-indigo-950/15 p-5 shadow-[0_0_0_1px_rgba(99,102,241,0.06)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-indigo-100">Deployment environment</h2>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
            Holistic audit of platform environment variables. Values are read from the running server process (Vercel /
            .env.local) — <strong className="font-medium text-slate-300">secrets are never shown in full</strong>.
            Edit deployment secrets in your host dashboard or local <code className="rounded bg-black/35 px-1">.env.local</code>
            , then redeploy or restart dev. Non-secret tunables (fees, FX, OpenPay card) remain editable in sections
            below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runProbe()}
          disabled={probing || loading}
          className="rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3 py-2 text-xs font-medium text-indigo-100 hover:border-indigo-400/60 disabled:opacity-50"
        >
          {probing ? "Probing PSP APIs…" : "Probe LivePay / Relworx"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {loading && !data ? <p className="mt-4 text-sm text-slate-500">Loading environment audit…</p> : null}

      {data ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile
              label="Variables set"
              value={`${data.summary.setVars} / ${data.summary.totalVars}`}
              hint={`${coveragePct}% coverage`}
            />
            <SummaryTile
              label="Groups ready"
              value={`${data.summary.groupsReady} / ${data.summary.groupsTotal}`}
              hint="Healthy integrations"
            />
            <SummaryTile
              label="Runtime"
              value={data.summary.production ? "Production" : "Development"}
              hint={data.summary.appUrl ?? "NEXT_PUBLIC_APP_URL unset"}
            />
            <SummaryTile
              label="Prod gaps"
              value={String(data.summary.missingProduction)}
              hint="Missing production-required vars"
              accent={data.summary.missingProduction > 0 ? "warn" : undefined}
            />
          </div>

          {data.probedAt ? (
            <p className="mt-3 text-[11px] text-slate-500">
              Last PSP probe: {new Date(data.probedAt).toLocaleString()}
            </p>
          ) : null}

          <div className="mt-5 space-y-3">
            {data.groups.map((group) => {
              const open = expanded[group.id] ?? false;
              const missingProd = group.vars.filter((v) => v.missingInProduction);
              return (
                <div
                  key={group.id}
                  className="overflow-hidden rounded-lg border border-indigo-500/15 bg-black/20"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.02]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-white">{group.title}</span>
                        {healthBadge(group.healthy)}
                        {group.configured ? (
                          <span className="text-[10px] text-slate-500">configured</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{group.description}</p>
                    </div>
                    <span className="shrink-0 text-slate-500">{open ? "▾" : "▸"}</span>
                  </button>

                  {open ? (
                    <div className="border-t border-indigo-500/10 px-4 py-3">
                      {group.healthNote ? (
                        <p className="mb-3 rounded-lg border border-amber-500/25 bg-amber-950/25 px-3 py-2 text-xs text-amber-100">
                          {group.healthNote}
                        </p>
                      ) : null}

                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                        {group.webhookUrl ? (
                          <>
                            <span className="text-slate-500">Webhook:</span>
                            <code className="max-w-full truncate rounded bg-black/40 px-1.5 py-0.5 text-indigo-200/90">
                              {group.webhookUrl}
                            </code>
                            <button
                              type="button"
                              onClick={() => void copyText(group.webhookUrl!, group.id)}
                              className="text-indigo-300 hover:text-indigo-100"
                            >
                              {copied === group.id ? "Copied" : "Copy"}
                            </button>
                          </>
                        ) : null}
                        {group.masterUiAnchor && group.masterUiAnchor !== "deployment-environment" ? (
                          <Link
                            href={`#${group.masterUiAnchor}`}
                            className="text-indigo-300 hover:text-indigo-100"
                          >
                            Related Master settings →
                          </Link>
                        ) : null}
                        {group.docsPath ? (
                          <span className="text-slate-600">Docs: {group.docsPath}</span>
                        ) : null}
                      </div>

                      {missingProd.length > 0 ? (
                        <p className="mb-2 text-xs text-rose-300">
                          Missing in production: {missingProd.map((v) => v.name).join(", ")}
                        </p>
                      ) : null}

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left text-xs">
                          <thead>
                            <tr className="text-slate-500">
                              <th className="pb-2 pr-3 font-medium">Variable</th>
                              <th className="pb-2 pr-3 font-medium">Status</th>
                              <th className="pb-2 pr-3 font-medium">Preview</th>
                              <th className="pb-2 font-medium">Requirement</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.vars.map((v) => (
                              <tr key={v.name} className="border-t border-white/5">
                                <td className="py-2 pr-3 align-top">
                                  <p className="font-mono text-[11px] text-slate-200">{v.name}</p>
                                  <p className="mt-0.5 text-[10px] text-slate-500">{v.description}</p>
                                </td>
                                <td className="py-2 pr-3 align-top">
                                  {v.set ? (
                                    <span className="text-emerald-400">Set</span>
                                  ) : (
                                    <span className="text-slate-500">Unset</span>
                                  )}
                                  {v.missingInProduction ? (
                                    <span className="mt-0.5 block text-rose-400">Needed in prod</span>
                                  ) : null}
                                </td>
                                <td className="py-2 pr-3 align-top font-mono text-[11px] text-slate-400">
                                  {v.set ? v.maskedPreview ?? "—" : "—"}
                                </td>
                                <td className="py-2 align-top text-slate-500">{requirementLabel(v.requirement)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
            Template: <code className="text-slate-500">.env.example</code> · Local guide:{" "}
            <code className="text-slate-500">docs/LOCAL_DEV_AND_CREDENTIALS.md</code> · Production: Vercel → Project →
            Settings → Environment Variables. After changing env, restart <code className="text-slate-500">npm run dev</code>{" "}
            locally or redeploy on Vercel.
          </p>
        </>
      ) : null}
    </section>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "warn";
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        accent === "warn" ? "border-amber-500/30 bg-amber-950/20" : "border-indigo-500/15 bg-black/25"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-0.5 truncate text-[10px] text-slate-500">{hint}</p>
    </div>
  );
}

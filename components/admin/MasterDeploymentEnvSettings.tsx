"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";
import { fetchJson } from "@/utils/fetch-json";
import { readJsonResponse } from "@/utils/read-json-response";

type EnvVarSource = "dashboard" | "process" | "unset";

type EnvVarRow = {
  name: string;
  label: string;
  description: string;
  sensitive: boolean;
  requirement: "always" | "production" | "optional" | "all";
  set: boolean;
  source: EnvVarSource;
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

type AutonomousPayload = {
  registry: { scanned: number; added: string[]; skippedExisting: number };
  vercel: {
    ok: boolean;
    configured: boolean;
    synced: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
    message: string | null;
  } | null;
  vercelPending?: boolean;
};

type DeploymentPayload = {
  summary: {
    production: boolean;
    appUrl: string | null;
    totalVars: number;
    setVars: number;
    dashboardOverrides: number;
    missingProduction: number;
    groupsReady: number;
    groupsTotal: number;
  };
  groups: EnvGroup[];
  probedAt: string | null;
  autonomous?: AutonomousPayload | null;
};

function requirementLabel(r: EnvVarRow["requirement"]): string {
  if (r === "always") return "Required";
  if (r === "production") return "Production";
  if (r === "all") return "All environments";
  return "Optional";
}

function sourceLabel(source: EnvVarSource): string {
  if (source === "dashboard") return "Master dashboard";
  if (source === "process") return "Server / Vercel env";
  return "Unset";
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
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ core: true, livepay: true, relworx: true });
  const [copied, setCopied] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [addingRegistry, setAddingRegistry] = useState(false);
  const [newVarName, setNewVarName] = useState("");
  const [newVarLabel, setNewVarLabel] = useState("");
  const [newVarDescription, setNewVarDescription] = useState("");
  const [newVarSensitive, setNewVarSensitive] = useState(true);
  const [newVarRequirement, setNewVarRequirement] = useState<EnvVarRow["requirement"]>("optional");
  const [syncingVercel, setSyncingVercel] = useState(false);
  const [autonomousNote, setAutonomousNote] = useState<string | null>(null);

  const load = useCallback(async (probe = false) => {
    setError(null);
    const url = probe ? "/api/master/deployment-env?probe=1" : "/api/master/deployment-env";
    const r = await fetchJson(url, { credentials: "include" });
    const parsed = await readJsonResponse<DeploymentPayload>(r);
    if (!parsed.ok) throw new Error(parsed.error);
    setData(parsed.data);
    setDrafts({});
    const auto = parsed.data.autonomous;
    if (auto) {
      const parts: string[] = [];
      if (auto.registry.added.length > 0) {
        parts.push(`Auto-added ${auto.registry.added.length} variable(s) from codebase: ${auto.registry.added.join(", ")}`);
      } else {
        parts.push(`Registry scan: ${auto.registry.scanned} name(s) in codebase, none new.`);
      }
      if (auto.vercel?.configured) {
        parts.push(auto.vercel.message ?? `Vercel: ${auto.vercel.synced} synced.`);
        if (auto.vercel.errors.length > 0) {
          parts.push(auto.vercel.errors[0]);
        }
      } else if (auto.vercelPending) {
        parts.push("Vercel sync running in the background after this page loaded.");
      } else if (auto.vercel?.message) {
        parts.push(auto.vercel.message);
      }
      setAutonomousNote(parts.join(" "));
    }
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

  async function runVercelSync() {
    setSyncingVercel(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await fetchJson("/api/master/deployment-env/vercel-sync", {
        method: "POST",
        credentials: "include",
      });
      const parsed = await readJsonResponse<{
        ok?: boolean;
        registry?: AutonomousPayload["registry"];
        vercel?: AutonomousPayload["vercel"];
        status?: DeploymentPayload;
        error?: string;
      }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      if (parsed.data.status) setData({ ...parsed.data.status, autonomous: { registry: parsed.data.registry!, vercel: parsed.data.vercel ?? null } });
      const msg = parsed.data.vercel?.message ?? "Vercel sync finished.";
      setSuccess(msg);
      if (parsed.data.vercel?.errors?.length) {
        setError(parsed.data.vercel.errors.join("; "));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vercel sync failed");
    } finally {
      setSyncingVercel(false);
    }
  }

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

  function setDraft(name: string, value: string) {
    setDrafts((prev) => ({ ...prev, [name]: value }));
  }

  async function saveGroup(group: EnvGroup) {
    setSavingGroup(group.id);
    setError(null);
    setSuccess(null);
    try {
      const updates: Record<string, string | null> = {};
      for (const v of group.vars) {
        if (!(v.name in drafts)) continue;
        const val = drafts[v.name]?.trim() ?? "";
        updates[v.name] = val || null;
      }
      if (Object.keys(updates).length === 0) {
        setError("Change at least one value before saving.");
        return;
      }
      const r = await fetchJson("/api/master/deployment-env", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates }),
      });
      const parsed = await readJsonResponse<{
        ok?: boolean;
        saved?: string[];
        cleared?: string[];
        status?: DeploymentPayload;
        error?: string;
      }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      if (parsed.data.status) setData(parsed.data.status);
      else await load();
      setDrafts((prev) => {
        const next = { ...prev };
        for (const name of Object.keys(updates)) delete next[name];
        return next;
      });
      const saved = parsed.data.saved?.length ?? 0;
      const cleared = parsed.data.cleared?.length ?? 0;
      setSuccess(`Saved ${group.title}: ${saved} updated${cleared ? `, ${cleared} cleared` : ""}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingGroup(null);
    }
  }

  async function addRegistryVariable(e: React.FormEvent) {
    e.preventDefault();
    setAddingRegistry(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await fetchJson("/api/master/deployment-env/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newVarName.trim(),
          label: newVarLabel.trim(),
          description: newVarDescription.trim(),
          sensitive: newVarSensitive,
          requirement: newVarRequirement,
        }),
      });
      const parsed = await readJsonResponse<{ status?: DeploymentPayload; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      if (parsed.data.status) setData(parsed.data.status);
      else await load();
      const addedName = newVarName.trim().toUpperCase();
      setNewVarName("");
      setNewVarLabel("");
      setNewVarDescription("");
      setNewVarSensitive(true);
      setNewVarRequirement("optional");
      setExpanded((prev) => ({ ...prev, custom: true }));
      setSuccess(
        `Added ${addedName} to the deployment registry. Set its value in Custom (Master added).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add variable");
    } finally {
      setAddingRegistry(false);
    }
  }

  async function removeRegistryVariable(name: string) {
    if (!window.confirm(`Remove ${name} from the registry? Dashboard override for this name will also be deleted.`)) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const r = await fetchJson("/api/master/deployment-env/registry", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const parsed = await readJsonResponse<{ status?: DeploymentPayload; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      if (parsed.data.status) setData(parsed.data.status);
      else await load();
      setSuccess(`Removed ${name} from the custom registry.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove variable");
    }
  }

  async function clearDashboardOverride(name: string) {
    setError(null);
    setSuccess(null);
    try {
      const r = await fetchJson("/api/master/deployment-env", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates: { [name]: null } }),
      });
      const parsed = await readJsonResponse<{ status?: DeploymentPayload; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      if (parsed.data.status) setData(parsed.data.status);
      else await load();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setSuccess(`Cleared dashboard override for ${name}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed");
    }
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
            Save platform credentials here for <strong className="font-medium text-slate-300">local dev and Vercel production</strong> — values are{" "}
            <strong className="font-medium text-slate-300">encrypted in MongoDB</strong> and override server / Vercel env at runtime on every
            deployment. Dashboard values take precedence over <code className="rounded bg-black/35 px-1">.env.local</code>. Leave a field blank and save to clear a dashboard
            override. Secrets are never shown in full after save. Use <strong className="text-slate-300">Add custom variable</strong>{" "}
            below to register new env names (e.g. integration keys not yet in the built-in list). The registry{" "}
            <strong className="font-medium text-slate-300">auto-updates from the codebase</strong> on each load; set{" "}
            <code className="rounded bg-black/35 px-1">VERCEL_ACCESS_TOKEN</code> +{" "}
            <code className="rounded bg-black/35 px-1">VERCEL_PROJECT_ID</code> to{" "}
            <strong className="font-medium text-slate-300">push values to Vercel automatically</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runProbe()}
            disabled={probing || loading}
            className="rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3 py-2 text-xs font-medium text-indigo-100 hover:border-indigo-400/60 disabled:opacity-50"
          >
            {probing ? "Probing PSP APIs…" : "Probe LivePay / Relworx"}
          </button>
          <button
            type="button"
            onClick={() => void runVercelSync()}
            disabled={syncingVercel || loading}
            className="rounded-lg border border-sky-500/40 bg-sky-950/30 px-3 py-2 text-xs font-medium text-sky-100 hover:border-sky-400/60 disabled:opacity-50"
          >
            {syncingVercel ? "Syncing to Vercel…" : "Sync to Vercel now"}
          </button>
          <a
            href="/api/master/deployment-env/export"
            className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs font-medium text-emerald-100 hover:border-emerald-400/60"
          >
            Export for Vercel (.env)
          </a>
        </div>
        {autonomousNote ? (
          <p className="mt-2 text-xs text-cyan-200/90">{autonomousNote}</p>
        ) : null}
        <p className="mt-2 text-xs text-amber-200/90">
          Export includes real secret values (merged dashboard + server env). Import at Vercel → Settings →
          Environment Variables. Do not commit or share the downloaded file.
        </p>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-400">{success}</p> : null}
      {loading && !data ? <p className="mt-4 text-sm text-slate-500">Loading environment…</p> : null}

      {data ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryTile
              label="Variables set"
              value={`${data.summary.setVars} / ${data.summary.totalVars}`}
              hint={`${coveragePct}% coverage`}
            />
            <SummaryTile
              label="Dashboard saved"
              value={String(data.summary.dashboardOverrides)}
              hint="Encrypted overrides in DB"
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

          <form
            onSubmit={(e) => void addRegistryVariable(e)}
            className="mt-5 rounded-lg border border-violet-500/25 bg-violet-950/15 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Add custom variable</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Registers a new name in the Master env list (UPPER_SNAKE_CASE). Then set its value in the{" "}
              <strong className="text-slate-400">Custom (Master added)</strong> group.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="text-slate-400">Variable name</span>
                <input
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  placeholder="MY_API_KEY"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1526] px-3 py-2 font-mono text-xs text-white"
                  required
                />
              </label>
              <label className="block text-xs">
                <span className="text-slate-400">Label</span>
                <input
                  value={newVarLabel}
                  onChange={(e) => setNewVarLabel(e.target.value)}
                  placeholder="My API key"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1526] px-3 py-2 text-xs text-white"
                  required
                />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="text-slate-400">Description</span>
                <input
                  value={newVarDescription}
                  onChange={(e) => setNewVarDescription(e.target.value)}
                  placeholder="What this variable is used for"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1526] px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={newVarSensitive}
                  onChange={(e) => setNewVarSensitive(e.target.checked)}
                />
                Sensitive (mask after save)
              </label>
              <label className="block text-xs">
                <span className="text-slate-400">Requirement</span>
                <select
                  value={newVarRequirement}
                  onChange={(e) => setNewVarRequirement(e.target.value as EnvVarRow["requirement"])}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1526] px-3 py-2 text-xs text-white"
                >
                  <option value="optional">Optional</option>
                  <option value="production">Production</option>
                  <option value="always">Required</option>
                  <option value="all">All</option>
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={addingRegistry}
              className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {addingRegistry ? "Adding…" : "Add to registry"}
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {data.groups.map((group) => {
              const open = expanded[group.id] ?? false;
              const groupDirty = group.vars.some((v) => v.name in drafts);
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
                          <Link href={`#${group.masterUiAnchor}`} className="text-indigo-300 hover:text-indigo-100">
                            Related Master settings →
                          </Link>
                        ) : null}
                      </div>

                      <div className="space-y-4">
                        {group.vars.map((v) => (
                          <div key={v.name} className="rounded-lg border border-white/5 bg-black/20 p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-mono text-[11px] text-slate-200">{v.name}</p>
                                <p className="mt-0.5 text-[10px] text-slate-500">{v.description}</p>
                              </div>
                              <div className="text-right text-[10px] text-slate-500">
                                <p>{requirementLabel(v.requirement)}</p>
                                <p className={v.set ? "text-emerald-400" : "text-slate-600"}>
                                  {v.set ? `Set · ${sourceLabel(v.source)}` : "Unset"}
                                </p>
                                {v.set && v.maskedPreview ? (
                                  <p className="mt-0.5 font-mono text-slate-400">{v.maskedPreview}</p>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                {v.sensitive ? "Secret value" : "Value"}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-600">
                                {v.set
                                  ? "Type a new value to replace, or leave blank and save to clear."
                                  : "Enter a value and save this group."}
                              </p>
                              <PasswordRevealInput
                                value={drafts[v.name] ?? ""}
                                onChange={(val) => setDraft(v.name, val)}
                                autoComplete="off"
                                defaultVisible={!v.sensitive}
                                togglePresentation="text"
                                placeholder=""
                                className="mt-1.5 w-full rounded-lg border border-indigo-500/20 bg-[#0d1526] px-3 py-2 font-mono text-xs text-white placeholder:text-slate-600"
                              />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3">
                              {v.source === "dashboard" ? (
                                <button
                                  type="button"
                                  onClick={() => void clearDashboardOverride(v.name)}
                                  className="text-[10px] text-rose-300 hover:text-rose-100"
                                >
                                  Clear dashboard override (fall back to server env)
                                </button>
                              ) : null}
                              {group.id === "custom" ? (
                                <button
                                  type="button"
                                  onClick={() => void removeRegistryVariable(v.name)}
                                  className="text-[10px] text-violet-300 hover:text-violet-100"
                                >
                                  Remove from registry
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          disabled={!groupDirty || savingGroup === group.id}
                          onClick={() => void saveGroup(group)}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
                        >
                          {savingGroup === group.id ? "Saving…" : `Save ${group.title}`}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
            Overrides apply immediately on this server (no restart). Vercel / local <code className="text-slate-500">.env</code>{" "}
            still works as fallback. Template: <code className="text-slate-500">.env.example</code>.
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

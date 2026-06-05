"use client";

import { useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type Policy = {
  requireMasterApproval: boolean;
  autoRegistrationEnabled: boolean;
};

export function MasterSchoolWorkspaceRegistrationSettings() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetch("/api/master/school-workspace-registration", { credentials: "include" });
      const parsed = await readJsonResponse<Policy>(r);
      if (!cancelled && parsed.ok) setPolicy(parsed.data);
      if (!cancelled && !parsed.ok) setError(parsed.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(requireMasterApproval: boolean) {
    if (policy?.requireMasterApproval === requireMasterApproval) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch("/api/master/school-workspace-registration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requireMasterApproval }),
      });
      const parsed = await readJsonResponse<Policy>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setPolicy(parsed.data);
      setSaved(
        parsed.data.requireMasterApproval
          ? "Platform master approval enabled — new schools stay pending until you approve."
          : "Platform master approval disabled — school workspaces auto-register after email verification.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const requireMaster = policy?.requireMasterApproval ?? true;
  const autoRegistration = policy?.autoRegistrationEnabled ?? false;

  return (
    <section
      id="school-workspace-registration"
      className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 shadow-[0_0_0_1px_rgba(245,158,11,0.06)]"
    >
      <h2 className="text-sm font-semibold text-amber-100">Platform master approval</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">
        Enable or disable master approval for self-serve school workspace requests at{" "}
        <span className="font-mono text-slate-300">/admin/register</span>. When disabled, workspaces are activated
        automatically after the applicant verifies their email.
      </p>

      <label className="mt-5 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 md:min-h-0 md:items-center">
        <input
          type="checkbox"
          className="mt-1 shrink-0 md:mt-0"
          checked={requireMaster}
          disabled={busy || policy === null}
          onChange={(e) => void save(e.target.checked)}
        />
        <span className="text-sm text-slate-200">
          <strong className="font-medium text-white">Require platform master approval</strong>
          <span className="mt-1 block text-xs leading-relaxed text-slate-500">
            {requireMaster
              ? "School workspace auto-registration is off. New tenants stay pending until you approve them on /admin/master/organizations (email must be verified first)."
              : "School workspace auto-registration is on. After email verification, the workspace becomes active and programmes/FX are cloned from the default template. You still create org admin credentials manually."}
          </span>
        </span>
      </label>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <StatusPill
          label="Master approval"
          active={requireMaster}
          activeClass="border-amber-500/40 bg-amber-950/40 text-amber-100"
          inactiveClass="border-slate-600/40 bg-slate-900/40 text-slate-500"
        />
        <StatusPill
          label="Auto-registration"
          active={autoRegistration}
          activeClass="border-emerald-500/40 bg-emerald-950/40 text-emerald-100"
          inactiveClass="border-slate-600/40 bg-slate-900/40 text-slate-500"
        />
      </div>

      {policy === null && !error ? <p className="mt-3 text-xs text-slate-500">Loading registration policy…</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-emerald-400">{saved}</p> : null}
      {busy ? <p className="mt-2 text-xs text-slate-500">Saving…</p> : null}
    </section>
  );
}

function StatusPill({
  label,
  active,
  activeClass,
  inactiveClass,
}: {
  label: string;
  active: boolean;
  activeClass: string;
  inactiveClass: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-medium ${
        active ? activeClass : inactiveClass
      }`}
    >
      {label}: {active ? "On" : "Off"}
    </span>
  );
}

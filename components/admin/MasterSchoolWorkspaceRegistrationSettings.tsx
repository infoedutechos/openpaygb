"use client";

import { useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type Policy = {
  requireMasterApproval: boolean;
  autoRegistrationEnabled: boolean;
  autoGenerateAdminLogin: boolean;
  deferEmailVerification: boolean;
  autoRedirectAfterRegister: boolean;
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

  async function patch(
    updates: Partial<
      Pick<Policy, "requireMasterApproval" | "autoGenerateAdminLogin" | "deferEmailVerification">
    >,
  ) {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const body: Record<string, boolean> = {};
      if (updates.requireMasterApproval !== undefined) {
        body.requireMasterApproval = updates.requireMasterApproval;
      }
      if (updates.autoGenerateAdminLogin !== undefined) {
        body.autoGenerateAdminLogin = updates.autoGenerateAdminLogin;
      }
      if (updates.deferEmailVerification !== undefined) {
        body.deferEmailVerification = updates.deferEmailVerification;
      }
      const r = await fetch("/api/master/school-workspace-registration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const parsed = await readJsonResponse<Policy>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setPolicy(parsed.data);
      setSaved("School workspace registration settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const requireMaster = policy?.requireMasterApproval ?? true;
  const autoRegistration = policy?.autoRegistrationEnabled ?? false;
  const autoAdmin = policy?.autoGenerateAdminLogin ?? false;
  const deferEmail = policy?.deferEmailVerification ?? false;

  return (
    <section
      id="school-workspace-registration"
      className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 shadow-[0_0_0_1px_rgba(245,158,11,0.06)]"
    >
      <h2 className="text-sm font-semibold text-amber-100">School workspace self-registration</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">
        Schools request a workspace at{" "}
        <span className="font-mono text-slate-300">/admin/register</span>. Use the toggles below to
        control master approval, immediate redirect to the workspace portal, deferred email
        confirmation, and automatic school admin login provisioning.
      </p>

      <label className="mt-5 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 md:min-h-0 md:items-center">
        <input
          type="checkbox"
          className="mt-1 shrink-0 md:mt-0"
          checked={requireMaster}
          disabled={busy || policy === null}
          onChange={(e) => void patch({ requireMasterApproval: e.target.checked })}
        />
        <span className="text-sm text-slate-200">
          <strong className="font-medium text-white">Require platform master approval</strong>
          <span className="mt-1 block text-xs leading-relaxed text-slate-500">
            {requireMaster
              ? "Auto-registration is off — tenants stay pending until you approve on /admin/master/organizations."
              : "Auto-registration is on — after email verification, workspace becomes active and template programmes/FX are cloned."}
          </span>
        </span>
      </label>

      <label className="mt-3 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 md:min-h-0 md:items-center">
        <input
          type="checkbox"
          className="mt-1 shrink-0 md:mt-0"
          checked={deferEmail}
          disabled={busy || policy === null}
          onChange={(e) => void patch({ deferEmailVerification: e.target.checked })}
        />
        <span className="text-sm text-slate-200">
          <strong className="font-medium text-white">Defer email verification + auto-redirect</strong>
          <span className="mt-1 block text-xs leading-relaxed text-slate-500">
            After submit, applicants go straight to{" "}
            <span className="font-mono text-slate-400">/school/workspace-status</span> instead of
            waiting for an inbox link. They confirm email later from that portal. With
            auto-registration on, the workspace activates immediately on submit.
          </span>
        </span>
      </label>

      <label className="mt-3 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 md:min-h-0 md:items-center">
        <input
          type="checkbox"
          className="mt-1 shrink-0 md:mt-0"
          checked={autoAdmin}
          disabled={busy || policy === null}
          onChange={(e) => void patch({ autoGenerateAdminLogin: e.target.checked })}
        />
        <span className="text-sm text-slate-200">
          <strong className="font-medium text-white">Auto-generate school admin logins</strong>
          <span className="mt-1 block text-xs leading-relaxed text-slate-500">
            When enabled, the platform creates an org admin for the registration contact email on
            activation and emails a secure password-set link. School admins can change their password
            from the school admin dashboard.
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
        <StatusPill
          label="Defer email + redirect"
          active={deferEmail}
          activeClass="border-violet-500/40 bg-violet-950/40 text-violet-100"
          inactiveClass="border-slate-600/40 bg-slate-900/40 text-slate-500"
        />
        <StatusPill
          label="Auto admin login"
          active={autoAdmin}
          activeClass="border-sky-500/40 bg-sky-950/40 text-sky-100"
          inactiveClass="border-slate-600/40 bg-slate-900/40 text-slate-500"
        />
      </div>

      {policy === null && !error ? <p className="mt-3 text-xs text-slate-500">Loading…</p> : null}
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

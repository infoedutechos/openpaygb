"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PUBLIC_SCHOOL_LOGIN_PATH } from "@/lib/admin-auth-entry";
import { clientFetchErrorMessage } from "@/lib/client-fetch-error";
import type { WorkspaceVerificationStep } from "@/lib/workspace-verification-steps";
import { fetchJson } from "@/utils/fetch-json";

type StatusJson = {
  found: boolean;
  name?: string;
  slug?: string;
  tenantStatus?: string;
  emailVerified?: boolean;
  autoRegistrationEnabled?: boolean;
  payUrl?: string;
  workspacePortalUrl?: string;
  verificationSteps?: WorkspaceVerificationStep[];
  nextSteps?: string;
  error?: string;
};

function StepRow({ step }: { step: WorkspaceVerificationStep }) {
  const icon = step.done ? "✓" : step.skipped ? "—" : step.pending ? "…" : "○";
  const tone = step.done
    ? "text-emerald-400"
    : step.skipped
      ? "text-slate-600"
      : step.pending
        ? "text-amber-300"
        : "text-slate-500";
  return (
    <li className={`flex items-start gap-2 text-sm ${tone}`}>
      <span className="mt-0.5 w-4 shrink-0 font-mono text-xs">{icon}</span>
      <span>
        {step.label}
        {step.skipped ? <span className="ml-1 text-xs text-slate-600">(not required)</span> : null}
      </span>
    </li>
  );
}

function WorkspaceStatusInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug")?.trim().toLowerCase() ?? "";
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const justVerified = searchParams.get("verified") === "1";
  const justActivated = searchParams.get("activated") === "1";
  const [data, setData] = useState<StatusJson | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!slug && !email) {
      setLoading(false);
      setData({ found: false });
      return;
    }
    const sp = new URLSearchParams();
    if (slug) sp.set("slug", slug);
    if (email) sp.set("email", email);
    setLoading(true);
    try {
      const r = await fetchJson(`/api/public/workspace-status?${sp.toString()}`);
      const j = (await r.json()) as StatusJson;
      if (!r.ok) setData({ found: false, error: j.error ?? "Could not load status" });
      else setData(j);
    } catch (e) {
      setData((prev) => prev ?? { found: false, error: clientFetchErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [slug, email]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.found || data.tenantStatus === "active" || data.tenantStatus === "rejected") return;
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [data?.found, data?.tenantStatus, load]);

  const statusLabel =
    data?.tenantStatus === "active"
      ? "Active"
      : data?.tenantStatus === "rejected"
        ? "Not approved"
        : "Pending review";

  return (
    <main className="mx-auto max-w-lg px-4 py-12 text-slate-200">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400/90">ODEL HUB</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">Your school workspace</h1>
      <p className="mt-2 text-sm text-slate-400">
        Verification status and next steps for your registration. Bookmark this page to check progress.
      </p>

      {justVerified || justActivated ? (
        <p className="mt-6 rounded-lg border border-emerald-500/35 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-200/95">
          {justActivated
            ? "Email confirmed — your workspace is now active. Sign in below when your admin account is ready."
            : "Email confirmed — track your workspace approval progress on this page."}
        </p>
      ) : null}

      {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
      {!loading && data?.error ? <p className="mt-6 text-sm text-rose-400">{data.error}</p> : null}
      {!loading && data && !data.found ? (
        <p className="mt-6 text-sm text-slate-400">
          No workspace found for that slug or email. Check your registration confirmation or{" "}
          <Link href="/admin/register" className="text-cyan-300 hover:underline">
            register again
          </Link>
          .
        </p>
      ) : null}
      {!loading && data?.found ? (
        <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-[#0a101f] p-5 text-sm">
          <p>
            <span className="text-slate-500">School</span>
            <br />
            <span className="font-medium text-white">{data.name}</span>
            <span className="ml-2 font-mono text-xs text-slate-500">({data.slug})</span>
          </p>
          <p>
            <span className="text-slate-500">Overall status</span>
            <br />
            <span
              className={
                data.tenantStatus === "active"
                  ? "font-medium text-emerald-300"
                  : data.tenantStatus === "rejected"
                    ? "font-medium text-rose-300"
                    : "font-medium text-amber-200/90"
              }
            >
              {statusLabel}
            </span>
          </p>

          {data.verificationSteps?.length ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Verification checklist</p>
              <ul className="mt-3 space-y-2">
                {data.verificationSteps.map((step) => (
                  <StepRow key={step.id} step={step} />
                ))}
              </ul>
            </div>
          ) : null}

          {data.nextSteps ? (
            <p className="text-slate-300 leading-relaxed">{data.nextSteps}</p>
          ) : null}

          {data.tenantStatus === "active" ? (
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href={PUBLIC_SCHOOL_LOGIN_PATH}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-cyan-500"
              >
                Sign in to school admin
              </Link>
              {data.payUrl ? (
                <Link href={data.payUrl} className="text-center text-xs text-cyan-300 hover:underline">
                  Open guest pay page
                </Link>
              ) : null}
            </div>
          ) : data.tenantStatus === "pending" ? (
            <p className="text-xs text-slate-500">This page refreshes every 15 seconds while your request is pending.</p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-8 text-sm text-slate-500">
        <Link href={PUBLIC_SCHOOL_LOGIN_PATH} className="text-cyan-300/90 hover:underline">
          School admin sign-in
        </Link>
        {" · "}
        <Link href="/admin/register" className="text-slate-400 hover:text-white">
          Register a workspace
        </Link>
      </p>
    </main>
  );
}

export default function SchoolWorkspaceStatusPage() {
  return (
    <Suspense fallback={<p className="p-8 text-slate-500">Loading…</p>}>
      <WorkspaceStatusInner />
    </Suspense>
  );
}

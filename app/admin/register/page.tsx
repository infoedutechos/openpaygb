"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OdelShieldIcon } from "@/components/icons/OdelShieldIcon";
import { WorkspaceRegistrationSegmentPicker } from "@/components/admin/WorkspaceRegistrationSegmentPicker";
import { OrganizationUnitKindPicker } from "@/components/admin/OrganizationUnitKindPicker";
import { workspacePortalPath } from "@/lib/workspace-portal-url";
import type { OrganizationUnitKind } from "@/lib/organization-unit-kinds";
import {
  isRegistrationSegment,
  registrationSegmentCta,
  registrationSegmentSubtitle,
  registrationSegmentTitle,
  type RegistrationSegment,
} from "@/lib/institution-tier";

function RegisterForm({ segment }: { segment: RegistrationSegment }) {
  const router = useRouter();
  const [requireMasterApproval, setRequireMasterApproval] = useState(true);
  const [autoGenerateAdminLogin, setAutoGenerateAdminLogin] = useState(false);
  const [deferEmailVerification, setDeferEmailVerification] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [note, setNote] = useState("");
  const [unitKind, setUnitKind] = useState<OrganizationUnitKind>("main_campus");
  const [operatesUnitKinds, setOperatesUnitKinds] = useState<OrganizationUnitKind[]>([]);
  const [parentSlug, setParentSlug] = useState("");
  const [externalParentName, setExternalParentName] = useState("");
  const [parentOptions, setParentOptions] = useState<Array<{ slug: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [devConfirmUrl, setDevConfirmUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [submission, setSubmission] = useState<{ slug: string; email: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetch("/api/public/school-workspace-registration-policy");
      if (!r.ok) return;
      const j = (await r.json()) as {
        requireMasterApproval?: boolean;
        autoGenerateAdminLogin?: boolean;
        deferEmailVerification?: boolean;
      };
      if (!cancelled && typeof j.requireMasterApproval === "boolean") {
        setRequireMasterApproval(j.requireMasterApproval);
      }
      if (!cancelled && typeof j.autoGenerateAdminLogin === "boolean") {
        setAutoGenerateAdminLogin(j.autoGenerateAdminLogin);
      }
      if (!cancelled && typeof j.deferEmailVerification === "boolean") {
        setDeferEmailVerification(j.deferEmailVerification);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = parentSlug.trim();
    if (q.length < 2) {
      setParentOptions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const r = await fetch(`/api/public/organization-parent-search?q=${encodeURIComponent(q)}`);
      if (!r.ok || cancelled) return;
      const j = (await r.json()) as { organizations?: Array<{ slug: string; name: string }> };
      if (!cancelled) setParentOptions(j.organizations ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [parentSlug]);

  function toggleOperates(kind: OrganizationUnitKind) {
    setOperatesUnitKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setDevConfirmUrl(null);
    setBusy(true);
    try {
      const r = await fetch("/api/public/organization-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug.trim().toLowerCase(),
          registrationContactEmail: contact.trim().toLowerCase(),
          registrationWebsiteUrl: website.trim(),
          registrationNote: note,
          unitKind,
          operatesUnitKinds,
          parentOrganizationSlug: parentSlug.trim(),
          externalParentName: externalParentName.trim(),
          registrationSegment: segment,
        }),
      });
      const j = (await r.json()) as {
        error?: string;
        message?: string;
        emailSent?: boolean;
        devConfirmUrl?: string;
        redirectUrl?: string;
        deferEmailVerification?: boolean;
      };
      const email = contact.trim().toLowerCase();
      const submitted = { slug: slug.trim().toLowerCase(), email };
      if (!r.ok) {
        if (r.status === 503 && j.message) {
          setSubmission(submitted);
          setMsg(j.message);
          return;
        }
        throw new Error(j.error ?? "Registration failed");
      }
      if (j.redirectUrl && j.deferEmailVerification) {
        router.push(j.redirectUrl);
        return;
      }
      setSubmission(submitted);
      setMsg(j.message ?? "Request submitted. Check your email for the ODEL HUB verification link.");
      if (j.devConfirmUrl) setDevConfirmUrl(j.devConfirmUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    const email = submission?.email ?? contact.trim().toLowerCase();
    if (!email) return;
    setResendBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/public/organization-register/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = (await r.json()) as { error?: string; message?: string; devConfirmUrl?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not resend");
      setMsg(j.message ?? "If a pending workspace exists, a new link was sent.");
      if (j.devConfirmUrl) setDevConfirmUrl(j.devConfirmUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend");
    } finally {
      setResendBusy(false);
    }
  }

  const accent =
    segment === "higher"
      ? "text-cyan-300/90"
      : "text-sky-300/90";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#050810] text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%-10%,rgba(34,211,238,0.12),transparent)]" />
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">ODEL HUB</p>
            <div className="mx-auto mb-5 mt-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-cyan-500/20 to-transparent text-cyan-100">
              <OdelShieldIcon className="h-9 w-9" />
            </div>
            <p className={`text-xs font-bold uppercase tracking-[0.2em] ${accent}`}>
              {registrationSegmentTitle(segment)}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">{registrationSegmentCta(segment)}</h1>
            <p className="mt-1 text-sm font-medium text-slate-400">{registrationSegmentSubtitle(segment)}</p>
            <p className="mt-2 text-sm text-slate-500">
              {deferEmailVerification ? (
                <>
                  After you submit, you go straight to your{" "}
                  <strong className="text-slate-400">workspace portal</strong>. Email confirmation is a later step on
                  that page.
                  {!requireMasterApproval ? (
                    <>
                      {" "}
                      Your workspace is <strong className="text-slate-400">activated automatically</strong> on submit.
                      {autoGenerateAdminLogin
                        ? " You will receive a password-set link for school admin sign-in."
                        : null}
                    </>
                  ) : (
                    <> A platform master reviews your request after you are on the portal.</>
                  )}
                </>
              ) : requireMasterApproval ? (
                <>
                  Your workspace is created as <strong className="text-slate-400">pending</strong> until a platform
                  master approves it after you confirm your email.
                </>
              ) : (
                <>
                  After you confirm your email, your workspace is{" "}
                  <strong className="text-slate-400">activated automatically</strong> (programmes and fees copied from
                  the platform template).
                  {autoGenerateAdminLogin
                    ? " You will receive an email to set your school admin password."
                    : " Sign in at /school/login when your admin account is ready."}
                </>
              )}
            </p>
            <p className="mt-3">
              <Link href="/admin/register" className="text-xs text-slate-500 hover:text-cyan-300 hover:underline">
                ← Choose a different product line
              </Link>
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#0c1424]/95 p-8">
            <div>
              <label className="text-xs font-medium text-slate-400">School / institution name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">URL slug</label>
              <input
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="e.g. kampala-campus"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2 font-mono text-sm text-white"
              />
              <p className="mt-1 text-[11px] text-slate-600">Students will pay at `/pay/[your-slug]` after approval.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Contact email (required)</label>
              <input
                type="email"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2 text-sm text-white"
              />
              <p className="mt-1 text-[11px] text-slate-600">
                ODEL HUB sends a verification link with your registration details to this address.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">School website (optional)</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourschool.ac.ug"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2 text-sm text-white"
              />
              <p className="mt-1 text-[11px] text-slate-600">
                We may fetch your school favicon from this site for your pay page branding.
              </p>
            </div>
            <OrganizationUnitKindPicker
              unitKind={unitKind}
              operatesUnitKinds={operatesUnitKinds}
              parentSlug={parentSlug}
              externalParentName={externalParentName}
              parentOptions={parentOptions}
              onUnitKindChange={setUnitKind}
              onOperatesToggle={toggleOperates}
              onParentSlugChange={setParentSlug}
              onExternalParentChange={setExternalParentName}
            />
            <div>
              <label className="text-xs font-medium text-slate-400">Notes (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2 text-sm text-white"
              />
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            {msg ? <p className="text-sm text-emerald-400">{msg}</p> : null}
            {submission ? (
              <p className="text-sm text-slate-300">
                Track progress anytime:{" "}
                <Link
                  href={workspacePortalPath({ slug: submission.slug, email: submission.email })}
                  className="font-medium text-violet-300 underline hover:text-violet-200"
                >
                  Open your workspace portal
                </Link>
              </p>
            ) : null}
            {devConfirmUrl ? (
              <p className="break-all rounded-lg border border-amber-500/25 bg-amber-950/30 p-3 text-xs text-amber-100/90">
                Dev verification link:{" "}
                <a href={devConfirmUrl} className="font-mono text-cyan-300 underline">
                  {devConfirmUrl}
                </a>
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 py-3 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit request"}
            </button>
            {submission ? (
              <button
                type="button"
                disabled={resendBusy}
                onClick={() => void onResend()}
                className="w-full rounded-xl border border-white/15 py-2.5 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                {resendBusy ? "Sending…" : "Resend verification email"}
              </button>
            ) : null}
            <p className="text-center text-sm text-slate-500">
              Already have access?{" "}
              <Link href="/school/login" className="text-sky-400 hover:underline">
                School admin sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function RegisterPageRouter() {
  const searchParams = useSearchParams();
  const segmentRaw = searchParams.get("segment");
  if (!isRegistrationSegment(segmentRaw)) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#050810] px-4 py-12 text-slate-200">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%-10%,rgba(34,211,238,0.12),transparent)]" />
        <div className="relative mx-auto w-full max-w-3xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">ODEL HUB</p>
          </div>
          <WorkspaceRegistrationSegmentPicker />
        </div>
      </div>
    );
  }
  return <RegisterForm segment={segmentRaw} />;
}

export default function AdminRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050810] p-8 text-slate-500">Loading…</div>}>
      <RegisterPageRouter />
    </Suspense>
  );
}

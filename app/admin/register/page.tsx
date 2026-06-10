"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { OdelShieldIcon } from "@/components/icons/OdelShieldIcon";
import { OrganizationUnitKindPicker } from "@/components/admin/OrganizationUnitKindPicker";
import type { OrganizationUnitKind } from "@/lib/organization-unit-kinds";

function RegisterForm() {
  const [requireMasterApproval, setRequireMasterApproval] = useState(true);
  const [autoGenerateAdminLogin, setAutoGenerateAdminLogin] = useState(false);
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
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetch("/api/public/school-workspace-registration-policy");
      if (!r.ok) return;
      const j = (await r.json()) as {
        requireMasterApproval?: boolean;
        autoGenerateAdminLogin?: boolean;
      };
      if (!cancelled && typeof j.requireMasterApproval === "boolean") {
        setRequireMasterApproval(j.requireMasterApproval);
      }
      if (!cancelled && typeof j.autoGenerateAdminLogin === "boolean") {
        setAutoGenerateAdminLogin(j.autoGenerateAdminLogin);
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
        }),
      });
      const j = (await r.json()) as {
        error?: string;
        message?: string;
        emailSent?: boolean;
        devConfirmUrl?: string;
      };
      const email = contact.trim().toLowerCase();
      if (!r.ok) {
        if (r.status === 503 && j.message) {
          setSubmittedEmail(email);
          setMsg(j.message);
          return;
        }
        throw new Error(j.error ?? "Registration failed");
      }
      setSubmittedEmail(email);
      setMsg(j.message ?? "Request submitted. Check your email for the ODEL HUB verification link.");
      if (j.devConfirmUrl) setDevConfirmUrl(j.devConfirmUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    const email = submittedEmail ?? contact.trim().toLowerCase();
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
            <h1 className="text-2xl font-semibold text-white">Request school workspace</h1>
            <p className="mt-1 text-sm font-medium text-cyan-200/90">Self-register on our platform</p>
            <p className="mt-2 text-sm text-slate-500">
              {requireMasterApproval ? (
                <>
                  Your workspace is created as <strong className="text-slate-400">pending</strong> until a platform
                  master approves it after you confirm your email.
                </>
              ) : (
                <>
                  After you confirm your email, your workspace is <strong className="text-slate-400">activated automatically</strong>{" "}
                  (programmes and fees copied from the platform template).
                  {autoGenerateAdminLogin
                    ? " You will receive an email to set your school admin password."
                    : " A platform operator still creates your admin login."}
                </>
              )}
            </p>
            <ul className="mt-3 space-y-1.5 text-left text-xs text-slate-500">
              <li>1. Submit this form</li>
              <li>2. Open the <strong className="text-slate-400">ODEL HUB verification email</strong> (registration details included)</li>
              <li>3. Click the link — you are taken to the school sign-in page</li>
              {requireMasterApproval ? (
                <>
                  <li>4. Master approves the workspace and creates your admin login</li>
                  <li>
                    5. Sign in at{" "}
                    <Link href="/school/login" className="font-mono text-cyan-300/90 hover:underline">
                      /school/login
                    </Link>{" "}
                    with credentials from ODEL HUB
                  </li>
                </>
              ) : (
                <>
                  <li>4. Your workspace goes live automatically — guest pay at <span className="font-mono">/pay/your-slug</span></li>
                  <li>
                    5. Sign in at{" "}
                    <Link href="/school/login" className="font-mono text-cyan-300/90 hover:underline">
                      /school/login
                    </Link>{" "}
                    {autoGenerateAdminLogin
                      ? "using the password-set link sent to your contact email"
                      : "once the platform operator shares admin credentials"}
                  </li>
                </>
              )}
            </ul>
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
            {submittedEmail ? (
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

export default function AdminRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050810] p-8 text-slate-500">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}

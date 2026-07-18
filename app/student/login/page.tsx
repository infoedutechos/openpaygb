"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";
import { ContinueWithGoogleButton } from "@/components/student/ContinueWithGoogleButton";
import { RequestSchoolWorkspaceCta } from "@/components/tuition/RequestSchoolWorkspaceCta";
import type { TenantRow } from "@/components/tuition/TenantList";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/student";
  const qpError = searchParams.get("error");

  const [orgs, setOrgs] = useState<TenantRow[]>([]);
  const [organizationSlug, setOrganizationSlug] = useState("default");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(qpError);
  const [loginHint, setLoginHint] = useState<string | null>(null);
  const [showGoogleHint, setShowGoogleHint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/public/organizations");
      if (!r.ok) return;
      const j = (await r.json()) as { organizations?: TenantRow[] };
      const list = j.organizations ?? [];
      setOrgs(list);
      if (list.length) {
        setOrganizationSlug((prev) => {
          if (prev.trim() && list.some((o) => o.slug === prev.trim().toLowerCase())) return prev;
          return list.find((o) => o.slug === "default")?.slug ?? list[0].slug;
        });
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoginHint(null);
    setShowGoogleHint(false);
    setBusy(true);
    try {
      const id = loginId.trim();
      const looksLikeEmail = id.includes("@");
      const r = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationSlug: organizationSlug.trim().toLowerCase(),
          ...(looksLikeEmail ? { email: id } : { admissionNo: id }),
          password,
        }),
      });
      const j = (await r.json()) as {
        error?: string;
        code?: string;
        googleSignInAvailable?: boolean;
      };
      if (!r.ok) {
        if (r.status === 403 && j.code === "PORTAL_PASSWORD_NOT_SET") {
          setLoginHint(j.error ?? null);
          setShowGoogleHint(Boolean(j.googleSignInAvailable));
          return;
        }
        throw new Error(j.error ?? "Sign-in failed");
      }
      const dest = next.startsWith("/student") ? next : "/student";
      router.replace(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050810] px-4 py-12 text-slate-200">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white">Student portal</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in with your school and either email or admission number, plus portal password — or use Google if you
            registered that way.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-[#0d1526] p-8">
          <div>
            <label className="text-xs font-medium text-slate-300">School</label>
            {orgs.length > 0 ? (
              <select
                value={organizationSlug}
                onChange={(e) => setOrganizationSlug(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2 text-sm text-white"
                autoComplete="organization"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.slug}>
                    {o.name} ({o.slug})
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={organizationSlug}
                onChange={(e) => setOrganizationSlug(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2 font-mono text-sm text-white"
                placeholder="default"
                autoComplete="organization"
              />
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300">Email or admission number</label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2 text-sm text-white"
              autoComplete="username"
              placeholder="email@example.com or admission no."
            />
            <p className="mt-1 text-[11px] text-slate-500">
              No email? Use the admission / registration number from the school.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300">Password</label>
            <div className="mt-1">
              <PasswordRevealInput
                value={password}
                onChange={setPassword}
                required
                className="w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2 text-sm text-white"
                autoComplete="current-password"
              />
            </div>
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {loginHint ? (
            <div className="rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
              {loginHint}
              {!showGoogleHint ? (
                <span className="mt-2 block text-xs text-amber-200/80">
                  <Link href="/student/register" className="underline hover:text-white">
                    Register for the portal
                  </Link>
                  {" · "}
                  Guest pay only? Your school admin can set a password under Admin → Students.
                </span>
              ) : null}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in with password"}
          </button>
        </form>

        <div className="relative flex items-center justify-center py-1">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" aria-hidden />
          <span className="relative bg-[#050810] px-3 text-xs font-medium uppercase tracking-wider text-slate-500">
            or
          </span>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0d1526] p-6">
          <p className="text-center text-sm text-slate-400">
            Sign in with Google if you registered with Google — no school slug needed.
          </p>
          <ContinueWithGoogleButton intent="login" />
          <p className="text-center text-xs text-slate-500">No school slug needed when you use Google.</p>
        </div>

        <p className="text-center text-sm text-slate-500">
          New here?{" "}
          <Link href="/student/register" className="text-sky-400 hover:underline">
            Create account
          </Link>
        </p>
        <p className="text-center text-sm text-slate-500">
          Paid tuition as a guest?{" "}
          <Link href="/student/claim" className="text-sky-400 hover:underline">
            Claim your portal account
          </Link>
        </p>
        <p className="text-center text-sm text-slate-500">
          Pay tuition:{" "}
          <Link href="/pay" className="text-sky-400 hover:underline">
            Choose a school to pay
          </Link>
        </p>
        <RequestSchoolWorkspaceCta variant="inline" className="pt-2" />
        {process.env.NODE_ENV === "development" ? (
          <p className="text-center text-xs text-slate-600">
            Dev seed: school <span className="font-mono text-slate-500">default</span>, email{" "}
            <span className="font-mono text-slate-500">student@odelhub.local</span>, password{" "}
            <span className="font-mono text-slate-500">ChangeMe_Student123!</span> (or run{" "}
            <span className="font-mono text-slate-500">npm run student:set-password</span>).
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050810] p-8 text-slate-500">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

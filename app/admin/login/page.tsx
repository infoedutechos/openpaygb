"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OdelShieldIcon } from "@/components/icons/OdelShieldIcon";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";
import Link from "next/link";
import { RequestSchoolWorkspaceCta } from "@/components/tuition/RequestSchoolWorkspaceCta";
import {
  ADMIN_LOGIN_COPY,
  adminLoginModeFromSearch,
  adminLoginPathForMode,
  type AdminLoginMode,
} from "@/lib/admin-auth-entry";
import { clientFetchErrorMessage, isClientFetchNetworkError } from "@/lib/client-fetch-error";

const LS_EMAIL = "odelhub_admin_email";
const LS_REMEMBER = "odelhub_admin_remember";

function describeLoginError(err: unknown): string {
  if (isClientFetchNetworkError(err)) {
    return clientFetchErrorMessage(
      err,
      "Could not reach the server. Start or restart the dev server (for example npm run dev:clean), wait until it is ready, then try again.",
    );
  }
  return err instanceof Error ? err.message : "Login failed";
}

function safeNextParam(raw: string | null, role: string): string {
  const fallback = role === "master" ? "/admin/master" : "/admin";
  if (!raw || raw[0] !== "/") return fallback;
  if (raw.startsWith("/school-admin")) {
    if (role === "org_admin" || role === "master") return raw;
    return fallback;
  }
  if (!raw.startsWith("/admin")) return fallback;
  if (role === "org_admin" && raw.startsWith("/admin/master")) return fallback;
  return raw;
}

function LoginModeTabs({
  mode,
  onSelect,
}: {
  mode: AdminLoginMode;
  onSelect: (mode: AdminLoginMode) => void;
}) {
  const tabs: { id: AdminLoginMode; label: string }[] = [
    { id: "school", label: "School admin" },
    { id: "master", label: "Platform master" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Sign-in type"
      className="flex rounded-xl border border-white/10 bg-black/30 p-1"
    >
      {tabs.map((tab) => {
        const active = mode === tab.id || (mode === "default" && tab.id === "school");
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.id)}
            className={`min-h-[44px] flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
              active
                ? tab.id === "master"
                  ? "bg-amber-600/90 text-slate-950 shadow-sm"
                  : "bg-cyan-600/90 text-slate-950 shadow-sm"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginMode = adminLoginModeFromSearch(searchParams);
  const copy =
    loginMode === "default"
      ? ADMIN_LOGIN_COPY.school
      : ADMIN_LOGIN_COPY[loginMode];
  const [email, setEmail] = useState("admin@odelhub.local");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const workspaceVerified = searchParams.get("workspaceVerified") === "1";
  const workspaceActivated = searchParams.get("workspaceActivated") === "1";
  const workspaceVerifyExpired = searchParams.get("workspaceVerifyExpired") === "1";
  const workspaceVerifyErrorRaw = searchParams.get("workspaceVerifyError");
  const workspaceVerifyError = workspaceVerifyErrorRaw
    ? (() => {
        try {
          return decodeURIComponent(workspaceVerifyErrorRaw);
        } catch {
          return workspaceVerifyErrorRaw;
        }
      })()
    : null;

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotErr, setForgotErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const remembered = localStorage.getItem(LS_REMEMBER);
      const saved = localStorage.getItem(LS_EMAIL);
      if (saved) setEmail(saved);
      if (remembered === "0") setRemember(false);
      if (remembered === "1") setRemember(true);
    } catch {
      /* private mode etc. */
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let cancelled = false;
    void fetch("/api/auth/setup-hint")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { email?: string } | null) => {
        if (cancelled || !j?.email) return;
        try {
          if (!localStorage.getItem(LS_EMAIL)) setEmail(j.email);
        } catch {
          setEmail(j.email);
        }
      })
      .catch(() => {
        /* dev server not ready */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (forgotOpen) {
      setForgotEmail(email.trim());
      setForgotMsg(null);
      setForgotErr(null);
    }
  }, [forgotOpen, email]);

  useEffect(() => {
    if (!forgotOpen) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape" && !forgotBusy) setForgotOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [forgotOpen, forgotBusy]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, rememberMe: remember }),
      });
      let j: { error?: string; hint?: string; admin?: { role?: string } };
      try {
        j = (await r.json()) as { error?: string; hint?: string; admin?: { role?: string } };
      } catch {
        throw new Error(!r.ok ? `Login failed (${r.status})` : "Invalid response from server");
      }
      if (!r.ok) {
        if (r.status === 401) {
          throw new Error(
            process.env.NODE_ENV === "development"
              ? (j.hint ??
                  "Invalid email or password. Run npm run admin:ensure (or npm run seed), then use SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD from .env.local.")
              : (j.error ?? "Invalid email or password")
          );
        }
        throw new Error(j.error ?? `Login failed (${r.status})`);
      }
      try {
        localStorage.setItem(LS_REMEMBER, remember ? "1" : "0");
        if (remember) localStorage.setItem(LS_EMAIL, email.trim());
        else localStorage.removeItem(LS_EMAIL);
      } catch {
        /* ignore */
      }
      const role = j.admin?.role ?? "org_admin";
      const next = safeNextParam(searchParams.get("next"), role);
      router.replace(next);
    } catch (err) {
      setError(describeLoginError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotErr(null);
    setForgotMsg(null);
    setForgotBusy(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const j = (await r.json()) as { error?: string; message?: string; registered?: boolean };
      if (!r.ok) {
        if (r.status === 404) {
          setForgotErr(j.error ?? "No admin account is registered with this email address.");
          return;
        }
        throw new Error(j.error ?? "Request failed");
      }
      setForgotMsg(j.message ?? "Reset link sent. Check your inbox.");
    } catch (err) {
      setForgotErr(describeLoginError(err));
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#050810] text-slate-200">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(34,211,238,0.14),transparent),radial-gradient(ellipse_50%_40%_at_100%_80%,rgba(56,189,248,0.06),transparent)]"
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">ODEL HUB</p>
            <div className="mx-auto mb-5 mt-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-cyan-500/20 to-sky-600/10 text-cyan-100 shadow-[0_0_40px_-8px_rgba(34,211,238,0.35)]">
              <OdelShieldIcon className="h-9 w-9" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{copy.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{copy.subtitle}</p>
          </div>

          <LoginModeTabs
            mode={loginMode}
            onSelect={(next) => {
              router.replace(adminLoginPathForMode(next));
            }}
          />

          {workspaceVerified ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200/95">
              {workspaceActivated ? (
                <>
                  Your school workspace email is confirmed and your tuition workspace is now{" "}
                  <strong className="text-emerald-100">active</strong>. Track status on your{" "}
                  <a href="/school/workspace-status" className="text-cyan-300 underline hover:text-cyan-200">
                    workspace portal
                  </a>
                  . Sign in here once you have admin credentials.
                </>
              ) : (
                <>
                  Your school workspace email is confirmed. Track approval on your{" "}
                  <a href="/school/workspace-status" className="text-cyan-300 underline hover:text-cyan-200">
                    workspace portal
                  </a>
                  . A platform master will share admin login credentials when approved.
                </>
              )}
            </p>
          ) : null}
          {workspaceVerifyError ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-950/25 px-4 py-3 text-sm text-rose-200/95">
              <p>{workspaceVerifyError}</p>
              {workspaceVerifyExpired ? (
                <p className="mt-2 text-xs text-rose-200/80">
                  <Link href="/admin/register" className="font-medium text-cyan-300 underline hover:text-cyan-200">
                    Resend verification email
                  </Link>{" "}
                  on the workspace request page (same contact email).
                </p>
              ) : null}
            </div>
          ) : null}
          {copy.hint ? (
            <p className="rounded-lg border border-cyan-500/20 bg-cyan-950/25 px-4 py-3 text-xs leading-relaxed text-slate-400">
              {copy.hint}
            </p>
          ) : null}

          <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#0c1424]/95 p-8 shadow-xl shadow-black/50 backdrop-blur-sm"
          >
            <div>
              <label className="text-xs font-medium text-slate-400" htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@odelhub.local"
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400" htmlFor="admin-password">
                Password
              </label>
              <div className="mt-1.5">
                <PasswordRevealInput
                  id="admin-password"
                  value={password}
                  onChange={setPassword}
                  className="w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <label className="flex cursor-pointer select-none items-center gap-2 text-slate-400">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-slate-600 bg-[#070b14] text-cyan-500 focus:ring-cyan-500/40"
                  aria-describedby="remember-hint"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-slate-400 underline decoration-slate-600 underline-offset-2 transition-colors hover:text-cyan-200 hover:decoration-cyan-400/50"
              >
                Forgot password?
              </button>
            </div>
            <p id="remember-hint" className="sr-only">
              When checked, your session lasts up to 30 days and your email is remembered on this device.
            </p>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Signing in…" : copy.submit}
            </button>
            {loginMode !== "master" ? (
              <p className="text-center text-xs text-slate-500">
                Platform operator?{" "}
                <Link href={adminLoginPathForMode("master")} className="text-amber-300/90 hover:underline">
                  Master console sign in
                </Link>
              </p>
            ) : (
              <p className="text-center text-xs text-slate-500">
                School staff?{" "}
                <Link href={adminLoginPathForMode("school")} className="text-cyan-300/90 hover:underline">
                  School admin sign in
                </Link>
              </p>
            )}
            {process.env.NODE_ENV === "development" ? (
              <p className="text-xs leading-relaxed text-slate-500">
                Dev: <code className="text-slate-400">.env.local</code> overrides <code className="text-slate-400">.env</code> for{" "}
                <code className="text-slate-400">SEED_ADMIN_*</code>. Run{" "}
                <code className="text-slate-400">npm run admin:ensure</code> to create or reset the admin without wiping data, or{" "}
                <code className="text-slate-400">npm run seed</code> for a full demo reset. Not the same as legacy{" "}
                <code className="text-slate-400">ADMIN_PASSWORD</code>.
              </p>
            ) : null}
          </form>
          <RequestSchoolWorkspaceCta variant="inline" className="mt-2" />
        </div>
      </div>

      <footer className="relative py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} ODEL HUB
      </footer>

      {forgotOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => !forgotBusy && setForgotOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-heading"
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0d1526] p-6 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="forgot-heading" className="text-lg font-semibold text-white">
              Reset password
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Enter the email on your school or master admin account. We only send a reset link when that address is
              registered. The link expires in one hour.
            </p>
            <form className="mt-5 space-y-4" onSubmit={onForgotSubmit}>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="forgot-email">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2"
                  autoComplete="email"
                />
              </div>
              {forgotErr ? <p className="text-sm text-rose-400">{forgotErr}</p> : null}
              {forgotMsg ? <p className="text-sm text-emerald-400">{forgotMsg}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={forgotBusy}
                  onClick={() => setForgotOpen(false)}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={forgotBusy}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  {forgotBusy ? "Sending…" : "Send reset link"}
                </button>
              </div>
            </form>
            <p className="mt-4 text-xs text-slate-600">
              Production resets require{" "}
              <code className="text-slate-500">RESEND_API_KEY</code>, <code className="text-slate-500">RESEND_FROM</code>, and{" "}
              <code className="text-slate-500">NEXT_PUBLIC_APP_URL</code>. In development, check the server log for the link
              when email is not configured.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#070b14] text-sm text-slate-400" aria-busy="true">
          Loading…
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}

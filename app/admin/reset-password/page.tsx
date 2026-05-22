"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OdelShieldIcon } from "@/components/icons/OdelShieldIcon";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Missing reset token. Open the link from your email.");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Reset failed");
      setDone(true);
      setTimeout(() => router.replace("/admin/login"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-200">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
              <OdelShieldIcon className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">ODEL HUB</h1>
            <p className="mt-2 text-sm text-slate-500">Set a new admin password</p>
          </div>

          {done ? (
            <p className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-6 py-4 text-center text-sm text-emerald-200">
              Password updated. Redirecting to sign in…
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              className="space-y-5 rounded-2xl border border-white/10 bg-[#0d1526] p-8 shadow-xl shadow-black/40"
            >
              {!token ? (
                <p className="text-sm text-amber-200/90">
                  No token in this link. Request a new reset from the login page.
                </p>
              ) : null}
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="reset-password-new">
                  New password
                </label>
                <div className="mt-1.5">
                  <PasswordRevealInput
                    id="reset-password-new"
                    value={password}
                    onChange={setPassword}
                    className="w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2"
                    autoComplete="new-password"
                    minLength={10}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="reset-password-confirm">
                  Confirm password
                </label>
                <div className="mt-1.5">
                  <PasswordRevealInput
                    id="reset-password-confirm"
                    value={confirm}
                    onChange={setConfirm}
                    className="w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2.5 text-sm text-white outline-none ring-cyan-500/30 focus:ring-2"
                    autoComplete="new-password"
                    minLength={10}
                  />
                </div>
              </div>
              {error ? <p className="text-sm text-rose-400">{error}</p> : null}
              <button
                type="submit"
                disabled={busy || !token}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Update password"}
              </button>
              <p className="text-center text-sm">
                <Link href="/admin/login" className="text-sky-400 hover:text-sky-300">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
      <footer className="py-6 text-center text-xs text-slate-600">© {new Date().getFullYear()} ODEL HUB</footer>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#070b14] text-sm text-slate-400" aria-busy="true">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";
import { ContinueWithGoogleButton } from "@/components/student/ContinueWithGoogleButton";

function RegisterInner() {
  const searchParams = useSearchParams();
  const qpError = searchParams.get("error");
  const qpNotice = searchParams.get("notice");

  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email")?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(qpError);
  const [done, setDone] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [devConfirmUrl, setDevConfirmUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDevConfirmUrl(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/student-signup/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const j = (await r.json()) as {
        error?: string;
        message?: string;
        emailSent?: boolean;
        devConfirmUrl?: string;
      };
      if (!r.ok) throw new Error(j.error ?? "Could not start registration");
      setEmailSent(j.emailSent === true);
      setDevConfirmUrl(typeof j.devConfirmUrl === "string" && j.devConfirmUrl.startsWith("http") ? j.devConfirmUrl : null);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050810] px-4 py-12 text-slate-200">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white">Create student account</h1>
          <p className="mt-2 text-sm text-slate-500">
            Continue with Google to pick your school next, or register with email and confirm via the link we send you.
          </p>
        </div>
        {qpNotice === "confirm_email" ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-center text-sm text-amber-100">
            Open the confirmation link from your email first, then you will land on the guest dashboard to pick your
            school.
          </p>
        ) : null}
        {done ? (
          <div
            className={`space-y-4 rounded-2xl border p-6 text-center text-sm ${
              emailSent
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                : "border-amber-500/35 bg-amber-950/20 text-amber-100"
            }`}
          >
            {emailSent ? (
              <>
                <p>
                  Check your inbox for the confirmation link. After you click it, you will be taken to your guest
                  dashboard.
                </p>
                <p className="text-xs text-slate-500">
                  If nothing arrives after a few minutes, check spam and the Promotions tab. In the Resend dashboard,
                  confirm the message was delivered and that your <span className="font-mono text-slate-400">RESEND_FROM</span>{" "}
                  domain is verified (unverified domains often block or drop mail).
                </p>
              </>
            ) : (
              <>
                {devConfirmUrl ? (
                  <>
                    <p>
                      Email was not sent from this server (Resend is not configured or the send failed). Your account
                      is still reserved — use the confirmation link below to open your guest dashboard (development
                      only).
                    </p>
                    <p className="pt-2">
                      <a
                        href={devConfirmUrl}
                        className="inline-flex break-all rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-left text-sm font-medium text-cyan-100 underline-offset-2 hover:underline"
                      >
                        Confirm email and continue
                      </a>
                    </p>
                    <p className="text-xs text-slate-500">
                      <button
                        type="button"
                        className="text-sky-400 underline hover:text-sky-300"
                        onClick={() => void navigator.clipboard?.writeText(devConfirmUrl).catch(() => {})}
                      >
                        Copy link
                      </button>
                      {" · "}
                      For production, set <span className="font-mono text-slate-400">RESEND_API_KEY</span> and{" "}
                      <span className="font-mono text-slate-400">RESEND_FROM</span> on the server.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      We could not send the confirmation email (missing{" "}
                      <span className="font-mono text-amber-200/90">RESEND_API_KEY</span> /{" "}
                      <span className="font-mono text-amber-200/90">RESEND_FROM</span>, or the provider rejected the
                      send).
                    </p>
                    <p className="text-xs text-slate-400">
                      Check server logs for <span className="font-mono text-slate-300">[student-signup]</span> if your
                      host exposes a confirmation URL, or configure Resend and submit again.
                    </p>
                    <p className="text-xs text-slate-500">
                      Verify your <span className="font-mono text-slate-400">RESEND_FROM</span> domain in Resend, then
                      use &quot;Send confirmation email&quot; again.
                    </p>
                  </>
                )}
              </>
            )}
            <Link href="/student/login" className="inline-block text-sky-400 hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0d1526] p-6">
              <ContinueWithGoogleButton intent="register" />
              <p className="text-center text-xs text-slate-500">Uses your Google account — no separate password here.</p>
            </div>
            <div className="relative flex items-center justify-center py-1">
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" aria-hidden />
              <span className="relative bg-[#050810] px-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                or register with email
              </span>
            </div>
            <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-[#0d1526] p-8">
              <div>
                <label className="text-xs text-slate-400">Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2 text-sm text-white"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2 text-sm text-white"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Password (min 8 characters)</label>
                <div className="mt-1">
                  <PasswordRevealInput
                    value={password}
                    onChange={setPassword}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2 text-sm text-white"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {error ? <p className="text-sm text-rose-400">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send confirmation email"}
              </button>
            </form>
          </div>
        )}
        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/student/login" className="text-sky-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function StudentRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050810] p-8 text-slate-500">Loading…</div>}>
      <RegisterInner />
    </Suspense>
  );
}

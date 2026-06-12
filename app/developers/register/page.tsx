"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/developers/dashboard";

  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCredentials(null);
    try {
      const redirectUris = redirectUri.trim() ? [redirectUri.trim()] : [];
      const res = await fetch("/api/public/ecosystem/register-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactEmail: email, redirectUris }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Registration failed");
      setCredentials({
        clientId: String(data.clientId),
        clientSecret: String(data.clientSecret),
      });
      setClientId(String(data.clientId));
      setClientSecret(String(data.clientSecret));
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/developers/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Sign-in failed");
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Developers</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">
        {mode === "register" ? "Register integrator app" : "Sign in to dashboard"}
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Self-serve third-party app registry for Partner API, OAuth, and OPGB/Dex flows.
      </p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === "register" ? "bg-emerald-500/20 text-emerald-200" : "text-slate-400"}`}
        >
          Register
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === "login" ? "bg-emerald-500/20 text-emerald-200" : "text-slate-400"}`}
        >
          Sign in
        </button>
      </div>

      {credentials ? (
        <div className="mt-6 rounded-xl border border-amber-400/40 bg-amber-950/25 p-4 text-sm">
          <p className="font-semibold text-amber-200">Save these credentials now</p>
          <p className="mt-2 font-mono text-xs text-white break-all">client_id: {credentials.clientId}</p>
          <p className="mt-1 font-mono text-xs text-white break-all">client_secret: {credentials.clientSecret}</p>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      {mode === "register" ? (
        <form onSubmit={onRegister} className="mt-6 space-y-4">
          <label className="block text-xs text-slate-400">
            App name
            <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <label className="block text-xs text-slate-400">
            Contact email
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <label className="block text-xs text-slate-400">
            OAuth redirect URI (optional)
            <input value={redirectUri} onChange={(e) => setRedirectUri(e.target.value)} placeholder="https://localhost:3000/callback" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <button disabled={busy} type="submit" className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">
            {busy ? "Registering…" : "Register app"}
          </button>
        </form>
      ) : (
        <form onSubmit={onLogin} className="mt-6 space-y-4">
          <label className="block text-xs text-slate-400">
            Client ID
            <input required value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white font-mono" />
          </label>
          <label className="block text-xs text-slate-400">
            Client secret
            <input required type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white font-mono" />
          </label>
          <button disabled={busy} type="submit" className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">
            {busy ? "Signing in…" : "Open dashboard"}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-xs text-slate-500">
        <Link href="/developers" className="text-emerald-300 hover:underline">
          ← Developer hub
        </Link>
      </p>
    </div>
  );
}

export default function DeveloperRegisterPage() {
  return (
    <Suspense fallback={<p className="p-8 text-slate-400">Loading…</p>}>
      <RegisterForm />
    </Suspense>
  );
}

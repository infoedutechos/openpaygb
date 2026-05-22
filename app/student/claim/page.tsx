"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";
import type { TenantRow } from "@/components/tuition/TenantList";

function ClaimInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orgs, setOrgs] = useState<TenantRow[]>([]);
  const [organizationSlug, setOrganizationSlug] = useState(
    searchParams.get("org")?.trim().toLowerCase() || "default",
  );
  const [email, setEmail] = useState(searchParams.get("email")?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/public/organizations");
      if (!r.ok) return;
      const j = (await r.json()) as { organizations?: TenantRow[] };
      const list = j.organizations ?? [];
      setOrgs(list);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/student-claim-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationSlug: organizationSlug.trim().toLowerCase(),
          email: email.trim(),
          password,
        }),
      });
      const j = (await r.json()) as { error?: string; code?: string };
      if (!r.ok) {
        if (j.code === "ALREADY_HAS_PASSWORD") {
          router.replace(`/student/login?email=${encodeURIComponent(email.trim())}`);
          return;
        }
        throw new Error(j.error ?? "Could not claim account");
      }
      router.replace("/my/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not claim account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-[#050810] px-4 py-12 text-slate-200">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white">Claim your student portal</h1>
          <p className="mt-2 text-sm text-slate-400">
            If you paid tuition as a guest with an email, set a portal password here to open your dashboard and
            receipts. Use the <strong className="text-slate-300">same school</strong> and{" "}
            <strong className="text-slate-300">same email</strong> you used at checkout (
            <Link href="/pay" className="text-cyan-400 hover:underline">
              pick school at /pay
            </Link>
            ).
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
              />
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300">Email used when paying</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300">New portal password (10+ characters)</label>
            <div className="mt-1">
              <PasswordRevealInput
                value={password}
                onChange={setPassword}
                required
                minLength={10}
                className="w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {busy ? "Setting up…" : "Open my dashboard"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have a password?{" "}
          <Link href="/student/login" className="text-sky-400 hover:underline">
            Sign in
          </Link>
          {" · "}
          <Link href="/student/register" className="text-sky-400 hover:underline">
            New registration
          </Link>
        </p>
      </div>
    </section>
  );
}

export default function StudentClaimPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050810] p-8 text-slate-500">Loading…</div>}>
      <ClaimInner />
    </Suspense>
  );
}

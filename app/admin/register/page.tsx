"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OdelShieldIcon } from "@/components/icons/OdelShieldIcon";

function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const r = await fetch("/api/public/organization-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug.trim().toLowerCase(),
          registrationContactEmail: contact || undefined,
          registrationNote: note,
        }),
      });
      const j = (await r.json()) as { error?: string; message?: string };
      if (!r.ok) throw new Error(j.error ?? "Registration failed");
      setMsg(j.message ?? "Request submitted.");
      setTimeout(() => router.replace("/school/login"), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
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
              Your workspace is created as <strong className="text-slate-400">pending</strong> until a platform master approves
              it. After approval they create your <strong className="text-slate-400">school admin account</strong> and share
              login details with you.
            </p>
            <ul className="mt-3 space-y-1.5 text-left text-xs text-slate-500">
              <li>1. Submit this form (workspace pending)</li>
              <li>2. Master approves your school</li>
              <li>3. You receive email + password for the school dashboard</li>
              <li>
                4. Sign in at{" "}
                <Link href="/school/login" className="font-mono text-cyan-300/90 hover:underline">
                  /school/login
                </Link>
              </li>
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
              <label className="text-xs font-medium text-slate-400">Contact email</label>
              <input
                type="email"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#070b14] px-3 py-2 text-sm text-white"
              />
            </div>
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
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 py-3 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit request"}
            </button>
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

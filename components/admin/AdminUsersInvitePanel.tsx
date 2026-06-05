"use client";

import { useState } from "react";

export function AdminUsersInvitePanel() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await fetch("/api/admin/org-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, name, password, sendInviteEmail }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not create admin");
      setMsg(
        j.emailSent
          ? `Invited ${j.admin?.email ?? email}. A password-set link was emailed.`
          : `Created ${j.admin?.email ?? email}. Share sign-in manually (email not sent).`,
      );
      setEmail("");
      setName("");
      setPassword("");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-5">
      <h2 className="text-sm font-semibold text-white">Invite organization admin</h2>
      <p className="mt-1 text-xs text-slate-400">
        Add a colleague with the same school workspace access. They receive a one-time password-set link (not a plaintext password).
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-slate-500">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Display name (optional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Temporary password (min 10)</label>
          <input
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={sendInviteEmail}
              onChange={(e) => setSendInviteEmail(e.target.checked)}
              className="rounded border-slate-600"
            />
            Email password-set link (Resend)
          </label>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create admin"}
          </button>
          {msg ? <p className="mt-2 text-sm text-emerald-400">{msg}</p> : null}
          {err ? <p className="mt-2 text-sm text-rose-400">{err}</p> : null}
        </div>
      </form>
    </section>
  );
}

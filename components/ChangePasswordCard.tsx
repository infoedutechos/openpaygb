"use client";

import { useState } from "react";

type Props = {
  /** POST endpoint — tuition admin (master or org) or signed-in student */
  action: "/api/auth/admin/change-password" | "/api/auth/student/change-password";
  /** When false, show explanation instead of the form */
  canChange?: boolean;
  disabledMessage?: string;
};

export function ChangePasswordCard({ action, canChange = true, disabledMessage }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (newPassword !== confirm) {
      setErr("New password and confirmation do not match.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(action, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setErr(j.error ?? "Could not update password.");
        return;
      }
      setMsg("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } finally {
      setLoading(false);
    }
  }

  if (!canChange) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0d1526]/80 p-5">
        <h2 className="text-sm font-semibold text-white">Password</h2>
        <p className="mt-2 text-sm text-slate-400">{disabledMessage ?? "Password change is not available."}</p>
      </div>
    );
  }

  return (
    <div id="password" className="rounded-xl border border-white/10 bg-[#0d1526]/80 p-5">
      <h2 className="text-sm font-semibold text-white">Change password</h2>
      <p className="mt-1 text-xs text-slate-500">Use at least 10 characters. You will stay signed in.</p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-3">
        <div>
          <label className="text-xs text-slate-500">Current password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="mt-1 w-full max-w-sm rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">New password</label>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={10}
            className="mt-1 w-full max-w-sm rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Confirm new password</label>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={10}
            className="mt-1 w-full max-w-sm rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </div>
        {err ? <p className="text-sm text-rose-400">{err}</p> : null}
        {msg ? <p className="text-sm text-emerald-400">{msg}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

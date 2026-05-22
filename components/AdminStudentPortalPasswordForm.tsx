"use client";

import { useState } from "react";
import { choicePrimaryCta } from "@/components/choice-cards";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";

type Props = {
  studentId: string;
  hasPortalPassword: boolean;
};

export function AdminStudentPortalPasswordForm({ studentId, hasPortalPassword }: Props) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/students/${studentId}/portal-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not save");
      setPassword("");
      setMsg("Portal password saved. Student can sign in at /student/login.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
      {!hasPortalPassword ? (
        <p className="text-xs text-amber-200/90">
          This student cannot use the portal until you set a password. They’ll sign in with their{" "}
          <strong className="text-amber-100">institutional email</strong> plus this password at{" "}
          <strong className="font-mono text-amber-100">/student/login</strong>.
        </p>
      ) : (
        <p className="text-xs text-slate-500">Update portal password — share the new secret with the student securely.</p>
      )}
      <label className="block text-xs text-slate-500">Portal password (min 8 characters)</label>
      <PasswordRevealInput
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        required
        minLength={8}
        className="w-full rounded-md border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white"
      />
      {err ? <p className="text-xs text-rose-400">{err}</p> : null}
      {msg ? <p className="text-xs text-emerald-400">{msg}</p> : null}
      <button type="submit" disabled={busy || password.length < 8} className={`${choicePrimaryCta} !w-auto px-4`}>
        {busy ? "Saving…" : hasPortalPassword ? "Update portal password" : "Enable student portal"}
      </button>
    </form>
  );
}

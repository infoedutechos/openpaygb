"use client";

import { useState } from "react";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";

type Props = {
  studentId: string;
  studentEmail: string;
  portalSignInEnabled: boolean;
};

export function StudentPortalPasswordForm({ studentId, studentEmail, portalSignInEnabled }: Props) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/students/${studentId}/portal-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not set password");
      setPassword("");
      setMessage(portalSignInEnabled ? "Portal password updated." : "Portal password set. Student can sign in at /student/login.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set password");
    } finally {
      setBusy(false);
    }
  }

  if (!studentEmail.trim()) {
    return (
      <p className="mt-4 text-sm text-amber-800">
        Add an email on this student record before setting a portal password.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Student portal password</h3>
      <p className="mt-1 text-xs text-slate-600">
        {portalSignInEnabled
          ? "Reset the password this student uses at /student/login."
          : "Guest payer — set a password so they can sign in and view receipts."}
      </p>
      <div className="mt-3 max-w-sm">
        <PasswordRevealInput
          value={password}
          onChange={setPassword}
          required
          minLength={10}
          placeholder="Min 10 characters"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </div>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {busy ? "Saving…" : portalSignInEnabled ? "Update portal password" : "Set portal password"}
      </button>
    </form>
  );
}

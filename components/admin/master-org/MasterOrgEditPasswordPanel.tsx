"use client";

import { useState } from "react";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";
import type { MasterOrgRow } from "@/components/admin/master-org/types";

type Props = {
  org: MasterOrgRow;
  registrationNote?: string;
  busy: boolean;
  onSaved: () => void;
  onError: (message: string) => void;
  onMessage: (message: string) => void;
};

/**
 * Per-tenant edit (name / contact / note) + set or reset org admin password.
 */
export function MasterOrgEditPasswordPanel({
  org,
  registrationNote = "",
  busy,
  onSaved,
  onError,
  onMessage,
}: Props) {
  const [name, setName] = useState(org.name);
  const [contact, setContact] = useState(org.registrationContactEmail || "");
  const [note, setNote] = useState(registrationNote);
  const [adminEmail, setAdminEmail] = useState(org.registrationContactEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localBusy, setLocalBusy] = useState<"profile" | "password" | null>(null);

  const disabled = busy || localBusy !== null;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLocalBusy("profile");
    try {
      const r = await fetch(`/api/master/organizations/${encodeURIComponent(org.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          registrationContactEmail: contact.trim(),
          registrationNote: note,
        }),
      });
      const j = (await r.json()) as { error?: string; message?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not update organization");
      onMessage(j.message ?? "Organization updated.");
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update organization");
    } finally {
      setLocalBusy(null);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) {
      onError("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirmPassword) {
      onError("Password and re-type password do not match.");
      return;
    }
    setLocalBusy("password");
    try {
      const r = await fetch(`/api/master/organizations/${encodeURIComponent(org.id)}/org-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          password,
          email: adminEmail.trim() || undefined,
        }),
      });
      const j = (await r.json()) as { error?: string; message?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not set password");
      setPassword("");
      setConfirmPassword("");
      onMessage(j.message ?? "Password saved.");
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not set password");
    } finally {
      setLocalBusy(null);
    }
  }

  return (
    <div className="mt-3 space-y-4 rounded-lg border border-amber-500/25 bg-amber-950/20 p-3">
      <form onSubmit={(e) => void saveProfile(e)} className="grid gap-2 sm:grid-cols-2">
        <p className="sm:col-span-2 text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">
          Edit organization
        </p>
        <div>
          <label className="text-[11px] text-slate-500">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={disabled}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Contact email</label>
          <input
            type="email"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            disabled={disabled}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] text-slate-500">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            disabled={disabled}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={disabled}
            className="rounded bg-amber-700/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {localBusy === "profile" ? "Saving…" : "Save organization"}
          </button>
        </div>
      </form>

      <form onSubmit={(e) => void savePassword(e)} className="grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-2">
        <p className="sm:col-span-2 text-[11px] font-semibold uppercase tracking-wide text-sky-200/90">
          Add / reset org admin password
        </p>
        <p className="sm:col-span-2 text-[11px] text-slate-500">
          Creates a school admin if missing, or resets the password for that email. Sign-in:{" "}
          <code className="text-slate-400">/school/login</code>
        </p>
        <div className="sm:col-span-2">
          <label className="text-[11px] text-slate-500">Admin email</label>
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder={org.registrationContactEmail || "admin@school.example"}
            disabled={disabled}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Password (min 10)</label>
          <div className="mt-1">
            <PasswordRevealInput
              value={password}
              onChange={setPassword}
              required
              minLength={10}
              disabled={disabled}
              autoComplete="new-password"
              className="w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-2 py-1.5 text-sm text-white"
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Re-type password</label>
          <div className="mt-1">
            <PasswordRevealInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              minLength={10}
              disabled={disabled}
              autoComplete="new-password"
              className="w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-2 py-1.5 text-sm text-white"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={disabled}
            className="rounded bg-sky-700/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {localBusy === "password" ? "Saving…" : "Save password"}
          </button>
        </div>
      </form>
    </div>
  );
}

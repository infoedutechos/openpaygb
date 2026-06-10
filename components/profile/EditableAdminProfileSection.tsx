"use client";

import { useCallback, useRef, useState } from "react";
import { AdminAccountPasswordSection } from "@/components/admin/AdminAccountPasswordSection";
import { useAuthMe } from "@/hooks/useAuthMe";
import { profileFromAuthAdmin } from "@/lib/profile-mappers";
import { UserProfilePanel } from "@/components/profile/UserProfilePanel";

type Props = {
  includePassword?: boolean;
};

export function EditableAdminProfileSection({ includePassword = false }: Props) {
  const { data: authMe, loading, refresh } = useAuthMe();
  const admin = authMe?.admin;
  const fileRef = useRef<HTMLInputElement>(null);

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayName = nameDraft ?? admin?.name ?? "";

  const saveName = useCallback(async () => {
    if (!admin) return;
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }
    setSavingName(true);
    setError(null);
    setMessage(null);
    const r = await fetch("/api/auth/admin/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const j = (await r.json()) as { error?: string };
    setSavingName(false);
    if (!r.ok) {
      setError(j.error ?? "Could not save name");
      return;
    }
    setNameDraft(null);
    setMessage("Profile updated.");
    await refresh();
  }, [admin, displayName, refresh]);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!admin) return;
      setImageBusy(true);
      setError(null);
      setMessage(null);
      const form = new FormData();
      form.set("file", file);
      const r = await fetch("/api/auth/admin/profile-image", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const j = (await r.json()) as { error?: string };
      setImageBusy(false);
      if (!r.ok) {
        setError(j.error ?? "Could not upload image");
        return;
      }
      setMessage("Profile photo updated.");
      await refresh();
    },
    [admin, refresh],
  );

  const removeImage = useCallback(async () => {
    if (!admin) return;
    setImageBusy(true);
    setError(null);
    const r = await fetch("/api/auth/admin/profile-image", {
      method: "DELETE",
      credentials: "include",
    });
    setImageBusy(false);
    if (!r.ok) {
      const j = (await r.json()) as { error?: string };
      setError(j.error ?? "Could not remove image");
      return;
    }
    setMessage("Profile photo removed.");
    await refresh();
  }, [admin, refresh]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading profile…</p>;
  }
  if (!admin) {
    return null;
  }

  const profile = profileFromAuthAdmin(admin);
  const imageUrl = admin.profileImageUrl ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-[#0d1526]/80 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Profile photo</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-slate-500">
                {(profile.name || profile.email || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/x-icon,.ico"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadImage(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={imageBusy}
              onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-cyan-700/80 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {imageBusy ? "Uploading…" : imageUrl ? "Change photo" : "Upload photo"}
            </button>
            {imageUrl ? (
              <button
                type="button"
                disabled={imageBusy}
                onClick={() => void removeImage()}
                className="text-xs text-slate-400 underline hover:text-rose-300 disabled:opacity-50"
              >
                Remove photo
              </button>
            ) : null}
            <p className="text-[11px] text-slate-500">PNG, JPEG, WebP, or ICO — max 512 KB.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1526]/80 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Display name</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm text-slate-300">
            <span className="mb-1 block text-xs text-slate-500">Name shown in the admin shell</span>
            <input
              type="text"
              value={displayName}
              maxLength={120}
              onChange={(e) => setNameDraft(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-cyan-500/50"
            />
          </label>
          <button
            type="button"
            disabled={savingName || displayName.trim() === (admin.name ?? "").trim()}
            onClick={() => void saveName()}
            className="rounded-lg bg-emerald-700/80 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {savingName ? "Saving…" : "Save name"}
          </button>
        </div>
      </section>

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <UserProfilePanel profile={profile} showWelcome={false} />

      {includePassword ? (
        <section id="password" className="scroll-mt-6">
          <AdminAccountPasswordSection successHeading="Password & security" />
        </section>
      ) : null}
    </div>
  );
}

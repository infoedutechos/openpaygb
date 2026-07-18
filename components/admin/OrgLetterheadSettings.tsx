"use client";

import { useCallback, useEffect, useState } from "react";

type LetterheadSettings = {
  name: string;
  letterheadPhone: string;
  letterheadEmail: string;
  letterheadAddress: string;
  registrationWebsiteUrl: string;
  hasLetterheadLogo: boolean;
  letterheadLogoUrl: string | null;
  hasFavicon: boolean;
  faviconUrl: string | null;
};

export function OrgLetterheadSettings() {
  const [data, setData] = useState<LetterheadSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/admin/organization/settings", { credentials: "include" });
      const j = (await r.json()) as LetterheadSettings & { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Failed to load");
      setData({
        name: j.name ?? "",
        letterheadPhone: j.letterheadPhone ?? "",
        letterheadEmail: j.letterheadEmail ?? "",
        letterheadAddress: j.letterheadAddress ?? "",
        registrationWebsiteUrl: j.registrationWebsiteUrl ?? "",
        hasLetterheadLogo: Boolean(j.hasLetterheadLogo),
        letterheadLogoUrl: j.letterheadLogoUrl ?? null,
        hasFavicon: Boolean(j.hasFavicon),
        faviconUrl: j.faviconUrl ?? null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!data) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const r = await fetch("/api/admin/organization/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letterheadPhone: data.letterheadPhone,
          letterheadEmail: data.letterheadEmail,
          letterheadAddress: data.letterheadAddress,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch("/api/admin/organization/letterhead-logo", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const j = (await r.json()) as { error?: string; publicUrl?: string };
      if (!r.ok) throw new Error(j.error ?? "Upload failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeLogo() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/organization/letterhead-logo", {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        throw new Error(j.error ?? "Remove failed");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="receipt-letterhead" className="scroll-mt-24 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="text-lg font-semibold text-white">Receipt letterhead</h2>
      <p className="mt-1 text-sm text-slate-400">
        School name, logo, and contact details appear on receipt Preview, public receipts, and PDF downloads — beside
        the ODEL HUB platform logo and Master Admin support contacts.
      </p>
      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {data ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-300">
            School name on receipts: <strong className="text-white">{data.name}</strong>
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {(data.letterheadLogoUrl || data.faviconUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.letterheadLogoUrl || data.faviconUrl || ""}
                alt="Letterhead logo preview"
                className="h-16 w-16 rounded-lg border border-white/10 bg-white object-contain p-1"
              />
            )}
            <label className="cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5">
              Upload letterhead logo
              <input
                type="file"
                accept=".ico,.png,image/x-icon,image/png"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                  e.target.value = "";
                }}
              />
            </label>
            {data.hasLetterheadLogo ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeLogo()}
                className="text-xs text-rose-300 hover:underline disabled:opacity-50"
              >
                Remove logo
              </button>
            ) : (
              <span className="text-xs text-slate-500">
                {data.hasFavicon ? "Using favicon as fallback until you upload a letterhead logo." : "No logo yet."}
              </span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Phone
              <input
                value={data.letterheadPhone}
                onChange={(e) => setData({ ...data, letterheadPhone: e.target.value })}
                className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Email
              <input
                type="email"
                value={data.letterheadEmail}
                onChange={(e) => setData({ ...data, letterheadEmail: e.target.value })}
                className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400 sm:col-span-2">
              Address
              <textarea
                value={data.letterheadAddress}
                onChange={(e) => setData({ ...data, letterheadAddress: e.target.value })}
                rows={2}
                className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save letterhead contacts"}
            </button>
            {saved ? <span className="text-sm text-emerald-400">Saved</span> : null}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Loading…</p>
      )}
    </section>
  );
}

"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "@/utils/fetch-json";

type OrgSettings = {
  slug: string;
  name: string;
  institutionTier: "school" | "university";
  currentAcademicYearLabel: string;
  hasFavicon: boolean;
  faviconUploadedAt: string | null;
  faviconUrl: string | null;
};

export function OrgFaviconSettings() {
  const [data, setData] = useState<OrgSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    const r = await fetchJson("/api/admin/organization/settings", { credentials: "include" });
    const j = (await r.json()) as OrgSettings & { error?: string };
    if (!r.ok) {
      setError(j.error ?? "Could not load settings");
      return;
    }
    setData(j);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch("/api/admin/organization/favicon", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Upload failed");
      setMessage("School favicon saved — visible on your pay page.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Remove your school favicon?")) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetchJson("/api/admin/organization/favicon", {
        method: "DELETE",
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Remove failed");
      setMessage("Favicon removed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <p className="text-sm text-slate-500">Loading school branding…</p>;
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-5">
      <h2 className="text-sm font-semibold text-cyan-100">School favicon</h2>
      <p className="mt-2 max-w-2xl text-xs text-slate-400">
        Shown on <code className="text-slate-500">/pay/{data.slug}</code> and browser tabs for your checkout page.
        ICO or PNG · max 512KB.
      </p>
      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {data.faviconUrl ? (
          <Image
            src={data.faviconUrl}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="h-12 w-12 rounded-lg border border-white/15 bg-black/40 object-contain p-1"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/20 text-[10px] text-slate-600">
            None
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".ico,.png,image/x-icon,image/png"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void upload(f);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {busy ? "Uploading…" : data.hasFavicon ? "Replace favicon" : "Upload favicon"}
        </button>
        {data.hasFavicon ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="rounded-lg border border-white/15 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

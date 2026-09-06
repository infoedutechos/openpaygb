"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type Branding = {
  platformDisplayName: string;
  seoTitle: string;
  seoDescription: string;
  themeAccentHex: string;
  homeHeroHeadline: string;
  homeHeroSubhead: string;
  hubMaintenanceMessage: string;
  copilotAssistantName: string;
};

const EMPTY: Branding = {
  platformDisplayName: "ODELPay HUB",
  seoTitle: "",
  seoDescription: "",
  themeAccentHex: "",
  homeHeroHeadline: "",
  homeHeroSubhead: "",
  hubMaintenanceMessage: "",
  copilotAssistantName: "ODELPay HUB Copilot",
};

export function MasterPlatformBrandingSettings() {
  const [data, setData] = useState<Branding>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await fetch("/api/master/platform-branding", { credentials: "include" });
    const parsed = await readJsonResponse<{ branding: Branding }>(r);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setData(parsed.data.branding);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch("/api/master/platform-branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const parsed = await readJsonResponse<{ branding: Branding }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setData(parsed.data.branding);
      setSaved("Platform branding saved — public pages pick this up on next request.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function field<K extends keyof Branding>(key: K, label: string, opts?: { textarea?: boolean; hint?: string }) {
    const value = data[key];
    return (
      <label className="block text-xs text-slate-500">
        {label}
        {opts?.textarea ? (
          <textarea
            value={value}
            onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))}
            rows={3}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
        )}
        {opts?.hint ? <span className="mt-1 block text-[11px] text-slate-600">{opts.hint}</span> : null}
      </label>
    );
  }

  return (
    <section
      id="platform-branding"
      className="rounded-xl border border-sky-500/25 bg-sky-950/15 p-5 shadow-[0_0_0_1px_rgba(14,165,233,0.06)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-sky-100">Platform branding & public copy</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Full public-site identity: display name, SEO, home hero, accent colour, copilot name, and hub
            maintenance message. Logo / social / PWA remain in Social & share below.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save branding"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">{error}</p>
      ) : null}
      {saved ? (
        <p className="mt-4 rounded-lg border border-sky-500/35 bg-sky-950/40 px-3 py-2 text-sm text-sky-100">{saved}</p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {field("platformDisplayName", "Platform display name")}
        {field("copilotAssistantName", "Copilot assistant name")}
        {field("seoTitle", "SEO title", { hint: "Blank = “{Display name} — Tuition, Play & Dex”" })}
        {field("themeAccentHex", "Accent colour (#RRGGBB)", { hint: "Blank = default theme cyan" })}
        <div className="sm:col-span-2">{field("seoDescription", "SEO / Open Graph description", { textarea: true })}</div>
        <div className="sm:col-span-2">{field("homeHeroHeadline", "Home hero headline", { textarea: true, hint: "Blank = keep built-in OdelPay / OpenPayGB headline" })}</div>
        <div className="sm:col-span-2">{field("homeHeroSubhead", "Home hero supporting sentence", { textarea: true })}</div>
        <div className="sm:col-span-2">{field("hubMaintenanceMessage", "Hub maintenance message", { textarea: true, hint: "Shown when a hub is toggled under maintenance" })}</div>
      </div>
    </section>
  );
}

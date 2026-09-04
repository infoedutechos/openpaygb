"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";
import type { PlayHubLaunchKind, PlayHubLaunchTarget, PlayHubOpenMode } from "@/lib/play-hub-launch-targets";
import { BUILTIN_PLAY_HUB_TARGET_ID } from "@/lib/play-hub-launch-targets";

type Payload = {
  targets: PlayHubLaunchTarget[];
  public: {
    active: PlayHubLaunchTarget | null;
    botFatherHint: string;
  };
};

const KIND_OPTIONS: { value: PlayHubLaunchKind; label: string }[] = [
  { value: "telegram_webapp", label: "Telegram Web App URL" },
  { value: "external", label: "External https URL" },
  { value: "iframe", label: "Embed (iframe) on /clicker" },
  { value: "internal", label: "Internal path (/clicker, …)" },
];

const OPEN_OPTIONS: { value: PlayHubOpenMode; label: string }[] = [
  { value: "telegram", label: "Open via Telegram" },
  { value: "new_tab", label: "New browser tab" },
  { value: "same_tab", label: "Same tab" },
  { value: "iframe", label: "Iframe embed" },
];

const emptyForm = {
  label: "",
  url: "",
  kind: "telegram_webapp" as PlayHubLaunchKind,
  openMode: "telegram" as PlayHubOpenMode,
  notes: "",
  activate: false,
};

export function MasterPlayHubLaunchSettings() {
  const [targets, setTargets] = useState<PlayHubLaunchTarget[] | null>(null);
  const [hint, setHint] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const applyPayload = useCallback((data: Payload) => {
    setTargets(data.targets);
    setHint(data.public.botFatherHint);
  }, []);

  const load = useCallback(async () => {
    const r = await fetch("/api/master/play-hub-launch-targets", { credentials: "include" });
    const parsed = await readJsonResponse<Payload>(r);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    applyPayload(parsed.data);
    setError(null);
  }, [applyPayload]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: unknown, busyKey: string, okMsg: string) {
    setBusy(busyKey);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch("/api/master/play-hub-launch-targets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const parsed = await readJsonResponse<Payload>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      applyPayload(parsed.data);
      setSaved(okMsg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  function startEdit(t: PlayHubLaunchTarget) {
    setEditingId(t.id);
    setForm({
      label: t.label,
      url: t.url,
      kind: t.kind,
      openMode: t.openMode,
      notes: t.notes,
      activate: t.isActive,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await patch(
      {
        action: "upsert",
        target: {
          id: editingId || undefined,
          label: form.label,
          url: form.url,
          kind: form.kind,
          openMode: form.openMode,
          notes: form.notes,
          activate: form.activate,
          enabled: true,
        },
      },
      "save",
      editingId ? "Launch target updated." : "Launch target added.",
    );
    resetForm();
  }

  return (
    <section
      id="play-hub-launch-targets"
      className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-950/15 p-5 shadow-[0_0_0_1px_rgba(217,70,239,0.06)]"
    >
      <h2 className="text-sm font-semibold text-fuchsia-100">Play Hub · game / launch URLs</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">
        Add Telegram Mini App / Web App URLs or any https link, then <strong className="font-medium text-slate-300">Activate</strong>{" "}
        exactly one as the primary Play Hub launch. Players on{" "}
        <a href="/clicker" className="text-fuchsia-200/90 underline-offset-2 hover:underline">
          /clicker
        </a>{" "}
        can switch between enabled targets. Deactivating means disable or activate another — only one is active.
      </p>
      {hint ? <p className="mt-2 text-xs text-fuchsia-200/70">{hint}</p> : null}

      <div className="mt-5 space-y-3">
        {targets === null ? (
          <p className="text-sm text-slate-500">Loading launch targets…</p>
        ) : targets.length === 0 ? (
          <p className="text-sm text-slate-500">No targets yet.</p>
        ) : (
          targets.map((t) => (
            <div
              key={t.id}
              className={`rounded-lg border px-4 py-3 ${
                t.isActive
                  ? "border-fuchsia-400/45 bg-fuchsia-900/25"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{t.label}</p>
                    {t.isActive ? (
                      <span className="rounded-full bg-fuchsia-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-100">
                        Active
                      </span>
                    ) : null}
                    {!t.enabled ? (
                      <span className="rounded-full bg-slate-600/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                        Disabled
                      </span>
                    ) : null}
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                      {t.kind}
                    </span>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-slate-400">{t.url}</p>
                  {t.notes ? <p className="mt-1 text-xs text-slate-500">{t.notes}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!t.isActive && t.enabled ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        void patch({ action: "activate", id: t.id }, `act-${t.id}`, `Activated “${t.label}”.`)
                      }
                      className="rounded-lg border border-fuchsia-400/40 bg-fuchsia-600/20 px-3 py-1.5 text-xs font-semibold text-fuchsia-50 hover:bg-fuchsia-600/35 disabled:opacity-50"
                    >
                      Activate
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void patch(
                        { action: "setEnabled", id: t.id, enabled: !t.enabled },
                        `en-${t.id}`,
                        t.enabled ? `Disabled “${t.label}”.` : `Enabled “${t.label}”.`,
                      )
                    }
                    className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-white/30 disabled:opacity-50"
                  >
                    {t.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => startEdit(t)}
                    className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-white/30 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  {t.id !== BUILTIN_PLAY_HUB_TARGET_ID ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        if (!window.confirm(`Delete “${t.label}”?`)) return;
                        void patch({ action: "delete", id: t.id }, `del-${t.id}`, `Deleted “${t.label}”.`);
                      }}
                      className="rounded-lg border border-rose-500/35 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:border-rose-400/50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-3 rounded-lg border border-white/10 bg-black/25 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fuchsia-200/90">
          {editingId ? "Edit launch target" : "Add launch target"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Label
            <input
              required
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="e.g. Partner Telegram game"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Kind
            <select
              value={form.kind}
              onChange={(e) => {
                const kind = e.target.value as PlayHubLaunchKind;
                setForm((f) => ({
                  ...f,
                  kind,
                  openMode:
                    kind === "iframe"
                      ? "iframe"
                      : kind === "telegram_webapp"
                        ? "telegram"
                        : kind === "internal"
                          ? "same_tab"
                          : "new_tab",
                }));
              }}
              className="mt-1 w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm text-white"
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs text-slate-400">
          URL
          <input
            required
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 font-mono text-sm text-white"
            placeholder="https://t.me/YourBot/app  or  https://game.example.com  or  /clicker"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Open mode
            <select
              value={form.openMode}
              onChange={(e) => setForm((f) => ({ ...f, openMode: e.target.value as PlayHubOpenMode }))}
              className="mt-1 w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm text-white"
            >
              {OPEN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.activate}
              onChange={(e) => setForm((f) => ({ ...f, activate: e.target.checked }))}
              className="rounded border-white/20"
            />
            Activate immediately (deactivates others)
          </label>
        </div>
        <label className="block text-xs text-slate-400">
          Notes (optional)
          <input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm text-white"
            placeholder="BotFather menu button, partner, etc."
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy !== null}
            className="rounded-xl border border-fuchsia-400/45 bg-fuchsia-600/25 px-4 py-2 text-sm font-semibold text-fuchsia-50 hover:bg-fuchsia-600/40 disabled:opacity-50"
          >
            {busy === "save" ? "Saving…" : editingId ? "Save changes" : "Add URL"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:border-white/30"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-emerald-400">{saved}</p> : null}
    </section>
  );
}

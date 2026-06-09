"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type TelegramHubSettings = {
  officialChannelName: string;
  officialChannelUrl: string;
  officialChannelId: string;
  botUsername: string | null;
  miniAppPath: string;
  masterEmail: string;
  masterTelegramId: string | null;
};

export function MasterTelegramHubSettings() {
  const [data, setData] = useState<TelegramHubSettings | null>(null);
  const [form, setForm] = useState({
    officialChannelName: "",
    officialChannelUrl: "",
    officialChannelId: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/master/telegram-hub", { credentials: "include" });
    const parsed = await readJsonResponse<TelegramHubSettings>(r);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setData(parsed.data);
    setForm({
      officialChannelName: parsed.data.officialChannelName,
      officialChannelUrl: parsed.data.officialChannelUrl,
      officialChannelId: parsed.data.officialChannelId,
    });
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch("/api/master/telegram-hub", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const parsed = await readJsonResponse<TelegramHubSettings>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setData(parsed.data);
      setForm({
        officialChannelName: parsed.data.officialChannelName,
        officialChannelUrl: parsed.data.officialChannelUrl,
        officialChannelId: parsed.data.officialChannelId,
      });
      setSaved("Telegram channel saved — footer social link updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const linkCommand = data
    ? `npm run admin:ensure-master-telegram -- ${data.masterEmail} YOUR_PERSONAL_TELEGRAM_ID`
    : "npm run admin:ensure-master-telegram -- oiptechcore@gmail.com YOUR_PERSONAL_TELEGRAM_ID";

  return (
    <section
      id="telegram-hub"
      className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-5 shadow-[0_0_0_1px_rgba(56,189,248,0.06)]"
    >
      <h2 className="text-sm font-semibold text-sky-100">Telegram bot &amp; official channel</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">
        The <strong className="text-slate-300">official channel</strong> is for announcements and community links
        (footer, support). <strong className="text-slate-300">Mini App master sign-in</strong> uses your{" "}
        <em>personal</em> Telegram user id — not the channel id.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-slate-300">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Channel name</span>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            value={form.officialChannelName}
            disabled={busy || !data}
            onChange={(e) => setForm((f) => ({ ...f, officialChannelName: e.target.value }))}
          />
        </label>
        <label className="block text-sm text-slate-300">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Channel id (reference)</span>
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white"
            value={form.officialChannelId}
            disabled={busy || !data}
            onChange={(e) => setForm((f) => ({ ...f, officialChannelId: e.target.value }))}
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            e.g. <span className="font-mono">-1003916461172</span> — for your records only; not used for admin sign-in.
          </span>
        </label>
      </div>

      <label className="mt-4 block text-sm text-slate-300">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invite / public link</span>
        <input
          type="url"
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white"
          value={form.officialChannelUrl}
          disabled={busy || !data}
          onChange={(e) => setForm((f) => ({ ...f, officialChannelUrl: e.target.value }))}
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !data}
          onClick={() => void save()}
          className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save channel"}
        </button>
        {data?.officialChannelUrl ? (
          <a
            href={data.officialChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/15 px-4 py-2 text-xs text-slate-300 hover:bg-white/5"
          >
            Open channel
          </a>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-emerald-400">{saved}</p> : null}

      <div className="mt-6 rounded-lg border border-white/10 bg-black/25 p-4">
        <p className="text-xs font-semibold text-slate-200">Bot &amp; Mini App</p>
        <dl className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Bot</dt>
            <dd className="font-mono text-slate-200">
              {data?.botUsername ? `@${data.botUsername}` : "Set NEXT_PUBLIC_BOT_USERNAME"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Mini App path</dt>
            <dd className="font-mono text-slate-200">{data?.miniAppPath ?? "/tma"}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-950/20 p-4">
        <p className="text-xs font-semibold text-amber-100">Your master Mini App sign-in</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          <strong className="text-amber-200">Do not use the channel id</strong> with{" "}
          <code className="text-slate-300">admin:ensure-master-telegram</code>. Open{" "}
          <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">
            @userinfobot
          </a>{" "}
          as yourself and copy your <strong className="text-slate-300">personal numeric id</strong> (positive number,
          not <span className="font-mono">-100…</span>).
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Status:{" "}
          {data?.masterTelegramId ? (
            <span className="font-mono text-emerald-300">Linked — {data.masterTelegramId}</span>
          ) : (
            <span className="text-amber-200">Not linked yet</span>
          )}
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-slate-300">
          {linkCommand}
        </pre>
      </div>
    </section>
  );
}

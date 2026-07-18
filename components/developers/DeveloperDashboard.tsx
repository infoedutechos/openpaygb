"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AppInfo = {
  id: string;
  name: string;
  clientId: string;
  redirectUris: string[];
  brandingName: string;
  scopes: string[];
};

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  enabled: boolean;
};

type WebhookRow = {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
};

export function DeveloperDashboard() {
  const [app, setApp] = useState<AppInfo | null>(null);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [scopes, setScopes] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  const [keyName, setKeyName] = useState("Production key");
  const [keyScopes, setKeyScopes] = useState<string[]>(["dex:quote:read", "dex:intent:create"]);
  const [whName, setWhName] = useState("Payment events");
  const [whUrl, setWhUrl] = useState("");
  const [whEvents, setWhEvents] = useState<string[]>(["payment.confirmed", "dex.intent.created"]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, keysRes, whRes] = await Promise.all([
        fetch("/api/developers/me", { cache: "no-store" }),
        fetch("/api/developers/keys", { cache: "no-store" }),
        fetch("/api/developers/webhooks", { cache: "no-store" }),
      ]);
      if (meRes.status === 401) {
        window.location.href = "/developers/register?next=/developers/dashboard";
        return;
      }
      if (!meRes.ok) throw new Error("Could not load app");
      const me = (await meRes.json()) as { app: AppInfo };
      setApp(me.app);
      if (keysRes.ok) {
        const kd = (await keysRes.json()) as { keys: ApiKeyRow[]; availableScopes: string[] };
        setKeys(kd.keys ?? []);
        setScopes(kd.availableScopes ?? []);
      }
      if (whRes.ok) {
        const wd = (await whRes.json()) as { endpoints: WebhookRow[]; availableEvents: string[] };
        setWebhooks(wd.endpoints ?? []);
        setEvents(wd.availableEvents ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey() {
    setMessage(null);
    setNewKeyPlain(null);
    const res = await fetch("/api/developers/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName, scopes: keyScopes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Key creation failed");
      return;
    }
    setNewKeyPlain(typeof data.apiKey === "string" ? data.apiKey : null);
    setMessage("API key created — copy it now.");
    void load();
  }

  async function createWebhook() {
    setMessage(null);
    setNewWebhookSecret(null);
    const res = await fetch("/api/developers/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: whName, url: whUrl, events: whEvents }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Webhook creation failed");
      return;
    }
    setNewWebhookSecret(typeof data.signingSecret === "string" ? data.signingSecret : null);
    setMessage("Webhook endpoint created.");
    void load();
  }

  async function logout() {
    await fetch("/api/developers/auth/logout", { method: "POST" });
    window.location.href = "/developers";
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading developer dashboard…</p>;
  }

  if (!app) {
    return (
      <p className="text-sm text-slate-400">
        Not signed in.{" "}
        <Link href="/developers/register" className="text-emerald-300 hover:underline">
          Register or sign in
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Developer app</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">{app.brandingName || app.name}</h1>
        <p className="mt-2 font-mono text-xs text-slate-400">client_id: {app.clientId}</p>
        <p className="mt-1 text-xs text-slate-500">
          Scopes: {app.scopes.join(", ")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/help?hub=dex" className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400/40">
            Integration FAQ
          </Link>
          <Link
            href="/api/docs/guides/USER_GUIDE_PARTNER_INTEGRATOR.md"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400/40"
          >
            Partner integrator guide
          </Link>
          <Link href="/help" className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400/40">
            Help center
          </Link>
          <button type="button" onClick={() => void logout()} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-400 hover:text-white">
            Sign out
          </button>
        </div>
      </header>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-200">{message}</p> : null}
      {newKeyPlain ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-950/30 p-4">
          <p className="text-xs font-semibold text-amber-200">New API key (shown once)</p>
          <code className="mt-2 block break-all text-xs text-white">{newKeyPlain}</code>
        </div>
      ) : null}
      {newWebhookSecret ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-950/30 p-4">
          <p className="text-xs font-semibold text-amber-200">Webhook signing secret</p>
          <code className="mt-2 block break-all text-xs text-white">{newWebhookSecret}</code>
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Partner API keys</h2>
        <p className="mt-1 text-sm text-slate-400">
          Use as <code className="text-emerald-200">Authorization: Bearer odelhub_live_…</code> on Partner APIs.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Key name
            <input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="text-xs text-slate-400">
            Scopes
            <div className="mt-2 flex flex-wrap gap-2">
              {scopes.map((s) => (
                <label key={s} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1">
                  <input
                    type="checkbox"
                    checked={keyScopes.includes(s)}
                    disabled={!app.scopes.includes(s)}
                    onChange={(e) =>
                      setKeyScopes((prev) =>
                        e.target.checked ? [...prev, s] : prev.filter((x) => x !== s),
                      )
                    }
                  />
                  <span className="font-mono text-[10px]">{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void createKey()}
          className="mt-4 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Generate API key
        </button>
        <ul className="mt-6 space-y-2">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm">
              <span className="text-white">{k.name}</span>
              <span className="font-mono text-xs text-slate-500">{k.keyPrefix}…</span>
              <span className="text-xs text-slate-400">{k.scopes.join(", ")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Webhook endpoints</h2>
        <p className="mt-1 text-sm text-slate-400">Receive payment and Dex intent events at your HTTPS URL.</p>
        <div className="mt-4 grid gap-3">
          <label className="block text-xs text-slate-400">
            Name
            <input value={whName} onChange={(e) => setWhName(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <label className="block text-xs text-slate-400">
            HTTPS URL
            <input value={whUrl} onChange={(e) => setWhUrl(e.target.value)} placeholder="https://api.example.com/odelhub/webhook" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <div className="flex flex-wrap gap-2 text-xs">
            {events.map((ev) => (
              <label key={ev} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1">
                <input
                  type="checkbox"
                  checked={whEvents.includes(ev)}
                  onChange={(e) =>
                    setWhEvents((prev) => (e.target.checked ? [...prev, ev] : prev.filter((x) => x !== ev)))
                  }
                />
                {ev}
              </label>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => void createWebhook()} className="mt-4 rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100">
          Add webhook endpoint
        </button>
        <ul className="mt-6 space-y-2">
          {webhooks.map((w) => (
            <li key={w.id} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
              <p className="font-medium text-white">{w.name}</p>
              <p className="font-mono text-xs text-slate-500">{w.url}</p>
              <p className="text-xs text-slate-400">{w.events.join(", ")}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-violet-500/20 bg-violet-950/15 p-6 text-sm text-slate-300">
        <h2 className="text-lg font-semibold text-violet-200">OAuth & OPGB partner APIs</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-slate-400">
          <li>
            Authorize: <code className="text-xs">/api/oauth/authorize?response_type=code&client_id=…</code>
          </li>
          <li>Token: <code className="text-xs">POST /api/oauth/token</code> (client_credentials or authorization_code)</li>
          <li>Dex quote: <code className="text-xs">GET /api/partner/v1/dex/quote</code></li>
          <li>Payment intents: <code className="text-xs">POST /api/partner/v1/dex/payment-intents</code></li>
          <li>OPGB balances: <code className="text-xs">GET /api/partner/v1/opgb/balances?studentId=…</code></li>
        </ul>
      </section>
    </div>
  );
}

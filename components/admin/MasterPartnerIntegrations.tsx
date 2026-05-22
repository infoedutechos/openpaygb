"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  organizationSlug: string | null;
  scopes: string[];
  enabled: boolean;
  lastUsedAt: string | null;
};

type WebhookRow = {
  id: string;
  name: string;
  url: string;
  organizationSlug: string | null;
  events: string[];
  enabled: boolean;
  deliveriesLast7d: number;
};

const SCOPES = ["payments:read", "payments:create", "students:read", "organizations:read"] as const;
const EVENTS = ["payment.confirmed", "payment.failed"] as const;

export function MasterPartnerIntegrations() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState<string[]>(["payments:read"]);

  const [hookName, setHookName] = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [hookEvents, setHookEvents] = useState<string[]>(["payment.confirmed"]);

  const load = useCallback(async () => {
    setError(null);
    const [kr, wr] = await Promise.all([
      fetch("/api/master/partner/keys", { credentials: "include" }),
      fetch("/api/master/partner/webhooks", { credentials: "include" }),
    ]);
    const keysRes = await readJsonResponse<{ keys: ApiKeyRow[] }>(kr);
    const hooksRes = await readJsonResponse<{ endpoints: WebhookRow[] }>(wr);
    if (!keysRes.ok) throw new Error(keysRes.error);
    if (!hooksRes.ok) throw new Error(hooksRes.error);
    setKeys(keysRes.data.keys);
    setWebhooks(hooksRes.data.endpoints);
  }, []);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNewKeyPlain(null);
    try {
      const r = await fetch("/api/master/partner/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: keyName, scopes: keyScopes }),
      });
      const parsed = await readJsonResponse<{ apiKey: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setNewKeyPlain(parsed.data.apiKey);
      setKeyName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function createWebhook(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNewWebhookSecret(null);
    try {
      const r = await fetch("/api/master/partner/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: hookName, url: hookUrl, events: hookEvents }),
      });
      const parsed = await readJsonResponse<{ signingSecret: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setNewWebhookSecret(parsed.data.signingSecret);
      setHookName("");
      setHookUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleKey(id: string, enabled: boolean) {
    await fetch(`/api/master/partner/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ enabled }),
    });
    await load();
  }

  async function toggleWebhook(id: string, enabled: boolean) {
    await fetch(`/api/master/partner/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ enabled }),
    });
    await load();
  }

  function toggleScope(scope: string) {
    setKeyScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }

  function toggleEvent(ev: string) {
    setHookEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }

  return (
    <section
      id="partner-integrations"
      className="rounded-xl border border-violet-500/25 bg-violet-950/15 p-5 shadow-[0_0_0_1px_rgba(139,92,246,0.06)]"
    >
      <h2 className="text-sm font-semibold text-violet-100">Partner API &amp; outbound webhooks</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
        Issue API keys for SIS/ERP machine-to-machine access at{" "}
        <code className="rounded bg-black/35 px-1 text-violet-200/90">/api/partner/v1/*</code>. Register HTTPS endpoints
        to receive <code className="rounded bg-black/30 px-1">payment.confirmed</code> events signed with{" "}
        <code className="rounded bg-black/30 px-1">X-Odelhub-Signature</code>. See{" "}
        <code className="text-slate-500">docs/PARTNER_API.md</code> and{" "}
        <code className="text-slate-500">docs/SIS_INTEGRATION_COOKBOOK.md</code>.
      </p>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {newKeyPlain ? (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs">
          <p className="font-medium text-emerald-200">New API key (copy now)</p>
          <code className="mt-2 block break-all text-emerald-100">{newKeyPlain}</code>
        </div>
      ) : null}
      {newWebhookSecret ? (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs">
          <p className="font-medium text-emerald-200">Webhook signing secret</p>
          <code className="mt-2 block break-all text-emerald-100">{newWebhookSecret}</code>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">API keys</h3>
          <ul className="mt-2 space-y-2 text-xs">
            {keys.length === 0 ? (
              <li className="text-slate-600">No keys yet.</li>
            ) : (
              keys.map((k) => (
                <li key={k.id} className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-medium text-white">{k.name}</span>
                      <span className="ml-2 font-mono text-slate-500">{k.keyPrefix}…</span>
                      {k.organizationSlug ? (
                        <span className="ml-2 text-slate-600">· {k.organizationSlug}</span>
                      ) : (
                        <span className="ml-2 text-amber-600/80">· platform</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleKey(k.id, !k.enabled)}
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] ${
                        k.enabled ? "bg-emerald-900/50 text-emerald-200" : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {k.enabled ? "enabled" : "disabled"}
                    </button>
                  </div>
                  <p className="mt-1 text-slate-600">{k.scopes.join(", ")}</p>
                </li>
              ))
            )}
          </ul>

          <form onSubmit={createKey} className="mt-4 space-y-3">
            <input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key label (e.g. Kampala SIS prod)"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={keyScopes.includes(s)}
                    onChange={() => toggleScope(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={busy || keyScopes.length === 0}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              Create API key
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outbound webhooks</h3>
          <ul className="mt-2 space-y-2 text-xs">
            {webhooks.length === 0 ? (
              <li className="text-slate-600">No endpoints yet.</li>
            ) : (
              webhooks.map((w) => (
                <li key={w.id} className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-white">{w.name}</span>
                    <button
                      type="button"
                      onClick={() => void toggleWebhook(w.id, !w.enabled)}
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] ${
                        w.enabled ? "bg-emerald-900/50 text-emerald-200" : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {w.enabled ? "on" : "off"}
                    </button>
                  </div>
                  <p className="mt-1 break-all font-mono text-slate-500">{w.url}</p>
                  <p className="mt-1 text-slate-600">
                    {w.events.join(", ")} · {w.deliveriesLast7d} deliveries (7d)
                  </p>
                </li>
              ))
            )}
          </ul>

          <form onSubmit={createWebhook} className="mt-4 space-y-3">
            <input
              value={hookName}
              onChange={(e) => setHookName(e.target.value)}
              placeholder="Endpoint name"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
            <input
              value={hookUrl}
              onChange={(e) => setHookUrl(e.target.value)}
              placeholder="https://your-sis.example/webhooks/odelhub"
              type="url"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
            <div className="flex flex-wrap gap-2">
              {EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <input type="checkbox" checked={hookEvents.includes(ev)} onChange={() => toggleEvent(ev)} />
                  {ev}
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={busy || hookEvents.length === 0}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              Add webhook endpoint
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

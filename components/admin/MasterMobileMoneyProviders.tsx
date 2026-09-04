"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type BuiltinRow = {
  code: string;
  name: string;
  webhookPath: string;
  configured: boolean;
  active: boolean;
  notes: string;
};

type CustomRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  paymentRail: string;
  authKind: string;
  webhookPath: string;
  webhookHeaderName: string;
  hasSecret: boolean;
  organizationSlug: string | null;
  notes: string;
};

export function MasterMobileMoneyProviders() {
  const [builtin, setBuiltin] = useState<BuiltinRow[]>([]);
  const [custom, setCustom] = useState<CustomRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{ path: string; secret: string } | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [authKind, setAuthKind] = useState<"shared_secret_header" | "hmac_sha256_body">("shared_secret_header");
  const [paymentRail, setPaymentRail] = useState("momo_bridge");

  const load = useCallback(async () => {
    setError(null);
    const r = await fetch("/api/master/mobile-money-providers", { credentials: "include" });
    const parsed = await readJsonResponse<{ builtin: BuiltinRow[]; custom: CustomRow[] }>(r);
    if (!parsed.ok) throw new Error(parsed.error);
    setBuiltin(parsed.data.builtin);
    setCustom(parsed.data.custom);
  }, []);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  async function createProvider(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreatedSecret(null);
    try {
      const r = await fetch("/api/master/mobile-money-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: code.trim().toLowerCase(),
          name: name.trim(),
          authKind,
          paymentRail,
          activate: true,
        }),
      });
      const parsed = await readJsonResponse<{
        provider: { webhookPath: string };
        webhookSecret: string;
      }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setCreatedSecret({
        path: parsed.data.provider.webhookPath,
        secret: parsed.data.webhookSecret,
      });
      setCode("");
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "active" | "disabled") {
    await fetch(`/api/master/mobile-money-providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function removeProvider(id: string) {
    if (!confirm("Remove this provider configuration?")) return;
    await fetch(`/api/master/mobile-money-providers/${id}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  return (
    <section
      id="mobile-money-providers"
      className="rounded-xl border border-teal-500/25 bg-teal-950/15 p-5 shadow-[0_0_0_1px_rgba(20,184,166,0.06)]"
    >
      <h2 className="text-sm font-semibold text-teal-100">Mobile money providers</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
        Built-in LivePay / Relworx / VixonPay / Mbiyo use API keys from{" "}
        <a href="#ug-momo-credentials" className="text-cyan-300 underline hover:text-cyan-200">
          Uganda MoMo API keys
        </a>{" "}
        (or{" "}
        <a href="#deployment-environment" className="text-cyan-300 underline hover:text-cyan-200">
          Deployment environment
        </a>
        ). Add custom PSPs here — each gets a webhook at{" "}
        <code className="rounded bg-black/35 px-1 text-teal-200/90">/api/webhooks/provider/&lt;code&gt;</code>.
        Register that URL with the provider and use the generated secret for authentication.
      </p>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

      {createdSecret ? (
        <div className="mt-4 space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs">
          <p className="font-medium text-emerald-200">Provider connected — copy credentials now</p>
          <p>
            <span className="text-slate-500">Webhook URL:</span>{" "}
            <code className="break-all text-emerald-100">{createdSecret.path}</code>
          </p>
          <p>
            <span className="text-slate-500">Secret:</span>{" "}
            <code className="break-all text-emerald-100">{createdSecret.secret}</code>
          </p>
        </div>
      ) : null}

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Built-in (environment)</h3>
      <ul className="mt-2 space-y-2">
        {builtin.map((b) => (
          <li key={b.code} className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-white">{b.name}</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] ${
                  b.active ? "bg-emerald-900/50 text-emerald-200" : "bg-slate-800 text-slate-500"
                }`}
              >
                {b.configured ? (b.active ? "configured" : "partial") : "not configured"}
              </span>
            </div>
            <p className="mt-1 break-all font-mono text-slate-500">{b.webhookPath}</p>
            <p className="mt-1 text-slate-600">{b.notes}</p>
            {["livepay", "relworx", "vixonpay"].includes(b.code) ? (
              <a
                href="#ug-momo-credentials"
                className="mt-2 inline-block text-[11px] text-cyan-300 underline hover:text-cyan-200"
              >
                Set {b.name} API keys →
              </a>
            ) : b.code === "mbiyo" ? (
              <a
                href="#deployment-environment"
                className="mt-2 inline-block text-[11px] text-cyan-300 underline hover:text-cyan-200"
              >
                Set Mbiyo keys in Deployment environment →
              </a>
            ) : null}
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Custom providers</h3>
      <ul className="mt-2 space-y-2">
        {custom.length === 0 ? (
          <li className="text-xs text-slate-600">No custom providers yet.</li>
        ) : (
          custom.map((p) => (
            <li key={p.id} className="rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-white">
                  {p.name}{" "}
                  <span className="font-mono text-slate-500">({p.code})</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void setStatus(p.id, p.status === "active" ? "disabled" : "active")}
                    className={`rounded px-2 py-0.5 text-[10px] ${
                      p.status === "active"
                        ? "bg-emerald-900/50 text-emerald-200"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {p.status}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeProvider(p.id)}
                    className="rounded px-2 py-0.5 text-[10px] text-rose-400 hover:bg-rose-950/40"
                  >
                    remove
                  </button>
                </div>
              </div>
              <p className="mt-1 break-all font-mono text-slate-500">{p.webhookPath}</p>
              <p className="mt-1 text-slate-600">
                Rail: {p.paymentRail} · Auth: {p.authKind}
                {p.organizationSlug ? ` · Org: ${p.organizationSlug}` : " · Platform-wide"}
                {p.hasSecret ? "" : " · ⚠ no secret"}
              </p>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={createProvider} className="mt-6 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[11px] text-slate-500">Provider code (URL slug)</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. flutterwave"
            pattern="[a-z0-9-]+"
            required
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Flutterwave Uganda"
            required
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Webhook auth</label>
          <select
            value={authKind}
            onChange={(e) => setAuthKind(e.target.value as typeof authKind)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
          >
            <option value="shared_secret_header">Shared secret header</option>
            <option value="hmac_sha256_body">HMAC-SHA256 (raw body)</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Payment rail on confirm</label>
          <select
            value={paymentRail}
            onChange={(e) => setPaymentRail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
          >
            <option value="momo_bridge">momo_bridge</option>
            <option value="mbiyo">mbiyo</option>
            <option value="web">web</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-500 disabled:opacity-50"
          >
            Connect new provider
          </button>
        </div>
      </form>
    </section>
  );
}

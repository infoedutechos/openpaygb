"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type ProviderRow = {
  code: string;
  name: string;
  category: string;
  paymentRail: string;
  brandLabel: string;
  services: string[];
  externalApis: string[];
  ourCheckoutApis: string[];
  ourWebhookApis: string[];
  ourConfigApis: string[];
  envVars: string[];
  docsUrl?: string;
  toggleable: boolean;
  configured: boolean;
  enabledByMaster: boolean;
  activeForPayments: boolean;
  webhookUrl: string | null;
  credentialsAnchor: string;
};

type CustomProvider = {
  id: string;
  code: string;
  name: string;
  status: string;
  paymentRail: string;
  webhookPath: string;
  organizationSlug: string | null;
  activeForPayments: boolean;
};

type Payload = {
  providers: ProviderRow[];
  policy: Record<string, boolean>;
  appUrl: string;
  customProviders: CustomProvider[];
};

export function MasterPaymentProviders() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/master/payment-providers", { credentials: "include" });
    const parsed = await readJsonResponse<Payload>(r);
    if (!parsed.ok) throw new Error(parsed.error);
    setData(parsed.data);
    setError(null);
  }, []);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  async function toggle(code: string, enabled: boolean) {
    if (!data) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch("/api/master/payment-providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toggles: { [code]: enabled } }),
      });
      const parsed = await readJsonResponse<Payload>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setData((prev) =>
        prev
          ? {
              ...prev,
              providers: parsed.data.providers,
              policy: parsed.data.policy,
            }
          : parsed.data,
      );
      setSaved(`${code} ${enabled ? "enabled" : "disabled"} for checkout.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="payment-providers"
      className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-5 shadow-[0_0_0_1px_rgba(139,92,246,0.06)]"
    >
      <h2 className="text-sm font-semibold text-violet-100">API payment providers</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
        Platform PSPs and rails — services, external APIs, and ODEL HUB routes. Tick to allow checkout; untick to hide
        a rail even when credentials are set.         API keys live in{" "}
        <a href="#ug-momo-credentials" className="text-cyan-300 underline hover:text-cyan-200">
          Uganda MoMo API keys
        </a>{" "}
        or{" "}
        <a href="#deployment-environment" className="text-cyan-300 underline hover:text-cyan-200">
          Environment
        </a>
        . Custom webhooks remain under{" "}
        <a href="#mobile-money-providers" className="text-cyan-300 underline hover:text-cyan-200">
          Mobile money (custom)
        </a>
        .
      </p>

      {data?.appUrl ? (
        <p className="mt-2 text-[11px] text-slate-500">
          App URL: <span className="font-mono text-slate-400">{data.appUrl}</span>
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-amber-200/90">
          Set <code className="text-amber-100">NEXT_PUBLIC_APP_URL</code> for webhook URLs (e.g.{" "}
          <span className="font-mono">https://odelpay.vercel.app</span>).
        </p>
      )}

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-emerald-400">{saved}</p> : null}

      {!data ? (
        <p className="mt-4 text-sm text-slate-500">Loading payment providers…</p>
      ) : (
        <div className="mt-5 space-y-3">
          {data.providers.map((p) => (
            <article
              key={p.code}
              className="rounded-lg border border-white/10 bg-black/25 text-xs text-slate-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{p.name}</h3>
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                      {p.code}
                    </span>
                    <span className="text-[10px] text-slate-500">{p.brandLabel}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Rail: <span className="font-mono text-slate-400">{p.paymentRail}</span> · Category: {p.category}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    label={p.configured ? "configured" : "not configured"}
                    ok={p.configured}
                    warn={!p.configured}
                  />
                  <StatusPill
                    label={p.activeForPayments ? "active" : "inactive"}
                    ok={p.activeForPayments}
                    warn={p.configured && !p.enabledByMaster}
                  />
                  {p.toggleable ? (
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={p.enabledByMaster}
                        disabled={busy}
                        onChange={(e) => void toggle(p.code, e.target.checked)}
                      />
                      <span className="text-[11px] text-slate-200">Use for payments</span>
                    </label>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setExpanded((x) => (x === p.code ? null : p.code))}
                    className="rounded border border-white/10 px-2 py-1 text-[10px] text-slate-400 hover:bg-white/5"
                  >
                    {expanded === p.code ? "Hide" : "Details"}
                  </button>
                </div>
              </div>

              {expanded === p.code ? (
                <div className="space-y-3 border-t border-white/10 px-4 py-3">
                  <DetailBlock title="Services" items={p.services} />
                  <DetailBlock title="Their APIs (outbound)" items={p.externalApis} mono />
                  <DetailBlock title="Our checkout / collect APIs" items={p.ourCheckoutApis} mono />
                  <DetailBlock title="Our webhook APIs (inbound)" items={p.ourWebhookApis} mono />
                  {p.ourConfigApis.length > 0 ? (
                    <DetailBlock title="Our config APIs" items={p.ourConfigApis} mono />
                  ) : null}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Credentials</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">{p.envVars.join(" · ")}</p>
                    <Link
                      href={p.credentialsAnchor}
                      className="mt-1 inline-block text-cyan-300 underline hover:text-cyan-200"
                    >
                      Open settings
                    </Link>
                  </div>
                  {p.webhookUrl ? (
                    <p className="break-all font-mono text-[11px] text-slate-500">
                      Webhook: {p.webhookUrl}
                    </p>
                  ) : null}
                  {p.docsUrl ? (
                    <a
                      href={p.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-300 underline hover:text-cyan-200"
                    >
                      Provider docs
                    </a>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}

          {data.customProviders.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Custom providers</h3>
              <ul className="mt-2 space-y-2">
                {data.customProviders.map((c) => (
                  <li key={c.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <span className="font-medium text-white">{c.name}</span>{" "}
                    <span className="font-mono text-slate-500">({c.code})</span> — {c.status}
                    <p className="mt-1 break-all font-mono text-slate-600">{c.webhookPath}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function StatusPill({
  label,
  ok,
  warn,
}: {
  label: string;
  ok?: boolean;
  warn?: boolean;
}) {
  const cls = ok
    ? "bg-emerald-900/50 text-emerald-200"
    : warn
      ? "bg-amber-900/40 text-amber-200"
      : "bg-slate-800 text-slate-500";
  return <span className={`rounded px-2 py-0.5 text-[10px] ${cls}`}>{label}</span>;
}

function DetailBlock({
  title,
  items,
  mono,
}: {
  title: string;
  items: string[];
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className={`mt-1 list-inside list-disc space-y-0.5 ${mono ? "font-mono text-[11px]" : ""}`}>
        {items.map((item) => (
          <li key={item} className="text-slate-400">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

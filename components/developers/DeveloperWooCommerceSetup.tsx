"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CopyTextButton } from "@/components/ui/CopyTextButton";

type KeyRow = {
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

type Props = {
  keys: KeyRow[];
  webhooks: WebhookRow[];
  onRefresh: () => void | Promise<void>;
  onGoToApiKeys: () => void;
  onGoToWebhooks: () => void;
  onCreatedKey?: (plain: string) => void;
  onCreatedWebhookSecret?: (secret: string) => void;
};

const WOO_SCOPES = ["charges:create", "charges:read"] as const;
const WOO_EVENTS = ["charge.confirmed", "charge.failed"] as const;
const STORAGE_KEY = "odelhub-woo-setup-v1";

type StepDone = {
  downloaded: boolean;
  activated: boolean;
  keyPasted: boolean;
  webhookPasted: boolean;
};

const defaultDone: StepDone = {
  downloaded: false,
  activated: false,
  keyPasted: false,
  webhookPasted: false,
};

function StepBadge({ done, n }: { done: boolean; n: number }) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        done ? "bg-emerald-500 text-slate-950" : "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
      }`}
    >
      {done ? "✓" : n}
    </span>
  );
}

export function DeveloperWooCommerceSetup({
  keys,
  webhooks,
  onRefresh,
  onGoToApiKeys,
  onGoToWebhooks,
  onCreatedKey,
  onCreatedWebhookSecret,
}: Props) {
  const [apiBase, setApiBase] = useState("https://odelpay.vercel.app");
  const [done, setDone] = useState<StepDone>(defaultDone);
  const [storeBase, setStoreBase] = useState("https://YOUR-STORE.example");
  const [busy, setBusy] = useState<"key" | "webhook" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wooKeyPlain, setWooKeyPlain] = useState<string | null>(null);
  const [wooSecretPlain, setWooSecretPlain] = useState<string | null>(null);
  const [lastKeyPrefix, setLastKeyPrefix] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiBase(window.location.origin);
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<StepDone> & { storeBase?: string };
          setDone({ ...defaultDone, ...parsed });
          if (typeof parsed.storeBase === "string" && parsed.storeBase.trim()) {
            setStoreBase(parsed.storeBase);
          }
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  const persistDone = useCallback((next: StepDone, nextStore?: string) => {
    setDone(next);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...next, storeBase: nextStore ?? storeBase }),
      );
    } catch {
      /* ignore */
    }
  }, [storeBase]);

  const webhookUrl = useMemo(() => {
    const base = storeBase.trim().replace(/\/+$/, "");
    return `${base}/wp-json/odelhub-openpaygb/v1/webhook`;
  }, [storeBase]);

  const wooKeys = useMemo(
    () =>
      keys.filter(
        (k) =>
          k.enabled &&
          WOO_SCOPES.every((s) => k.scopes.includes(s)),
      ),
    [keys],
  );

  const wooWebhooks = useMemo(
    () =>
      webhooks.filter(
        (w) =>
          w.enabled &&
          w.events.includes("charge.confirmed") &&
          w.url.includes("odelhub-openpaygb"),
      ),
    [webhooks],
  );

  async function createWooKey() {
    setBusy("key");
    setError(null);
    setWooKeyPlain(null);
    try {
      const res = await fetch("/api/developers/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "WooCommerce OpenPayGB",
          scopes: [...WOO_SCOPES],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not create API key");
      }
      const plain = typeof data.apiKey === "string" ? data.apiKey : null;
      setWooKeyPlain(plain);
      setLastKeyPrefix(
        typeof data.key?.keyPrefix === "string" ? data.key.keyPrefix : plain?.slice(0, 18) ?? null,
      );
      if (plain) onCreatedKey?.(plain);
      await onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "API key creation failed");
    } finally {
      setBusy(null);
    }
  }

  async function createWooWebhook() {
    setBusy("webhook");
    setError(null);
    setWooSecretPlain(null);
    try {
      let url: URL;
      try {
        url = new URL(webhookUrl);
      } catch {
        throw new Error("Enter a valid store base URL (https://your-shop.com)");
      }
      if (url.protocol !== "https:" && url.hostname !== "localhost") {
        throw new Error("Webhook URL must be https:// (except localhost)");
      }
      const res = await fetch("/api/developers/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "WooCommerce OpenPayGB",
          url: webhookUrl,
          events: [...WOO_EVENTS],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not create webhook");
      }
      const secret = typeof data.signingSecret === "string" ? data.signingSecret : null;
      setWooSecretPlain(secret);
      if (secret) onCreatedWebhookSecret?.(secret);
      await onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Webhook creation failed");
    } finally {
      setBusy(null);
    }
  }

  const checklistReady =
    done.downloaded &&
    done.activated &&
    Boolean(wooKeyPlain || wooKeys.length > 0) &&
    Boolean(wooSecretPlain || wooWebhooks.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-cyan-100">WooCommerce setup</h2>
        <p className="mt-2 text-sm text-slate-400">
          Execute the full OpenPayGB ↔ WooCommerce wiring here: download the plugin, mint a Partner API key, register
          the store webhook, then paste values into WP Admin → WooCommerce → Settings → Payments →{" "}
          <strong className="font-medium text-slate-200">OpenPayGB</strong>.
        </p>
        <p className="mt-2 font-mono text-xs text-cyan-200/90">
          <Link
            href="/integrations/woocommerce/odelhub-openpaygb"
            className="underline-offset-2 hover:underline"
          >
            integrations/woocommerce/odelhub-openpaygb
          </Link>
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">{error}</p>
      ) : null}

      {/* Step 1 */}
      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
        <div className="flex items-start gap-3">
          <StepBadge done={done.downloaded && done.activated} n={1} />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">Install plugin on WordPress</h3>
            <p className="mt-1 text-xs text-slate-400">
              Download the zip → unzip into{" "}
              <code className="text-slate-300">wp-content/plugins/odelhub-openpaygb/</code> → activate{" "}
              <strong className="font-medium text-slate-200">OpenPayGB for WooCommerce</strong>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="/api/public/woocommerce-plugin"
                onClick={() => persistDone({ ...done, downloaded: true })}
                className="inline-flex rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Download installable plugin (.zip)
              </a>
              <Link
                href="/integrations/woocommerce/odelhub-openpaygb"
                className="inline-flex rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5"
              >
                Plugin page
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={done.downloaded}
                  onChange={(e) => persistDone({ ...done, downloaded: e.target.checked })}
                />
                Zip downloaded
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={done.activated}
                  onChange={(e) => persistDone({ ...done, activated: e.target.checked })}
                />
                Unzipped &amp; activated in WP Admin
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
        <div className="flex items-start gap-3">
          <StepBadge done={Boolean(wooKeyPlain) || wooKeys.length > 0} n={2} />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">Partner API key</h3>
            <p className="mt-1 text-xs text-slate-400">
              Create a key with <code className="text-cyan-200">charges:create</code> +{" "}
              <code className="text-cyan-200">charges:read</code>, then paste it into the WooCommerce gateway{" "}
              <strong className="font-medium text-slate-200">Partner API key</strong> field.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void createWooKey()}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {busy === "key" ? "Creating…" : "Generate WooCommerce API key"}
              </button>
              <button
                type="button"
                onClick={onGoToApiKeys}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5"
              >
                Open Generated API keys
              </button>
            </div>
            {wooKeyPlain ? (
              <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-950/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-amber-200">Copy now — shown once</p>
                  <CopyTextButton text={wooKeyPlain} label="Copy API key" />
                </div>
                <code className="mt-2 block break-all text-xs text-white">{wooKeyPlain}</code>
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={done.keyPasted}
                    onChange={(e) => persistDone({ ...done, keyPasted: e.target.checked })}
                  />
                  Pasted into WooCommerce → OpenPayGB settings
                </label>
              </div>
            ) : wooKeys.length > 0 ? (
              <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-3 text-xs text-slate-400">
                <p className="font-medium text-emerald-200">Existing charge-capable keys</p>
                <ul className="mt-2 space-y-1">
                  {wooKeys.map((k) => (
                    <li key={k.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-white">{k.name}</span>
                      <span className="font-mono text-slate-500">{k.keyPrefix}…</span>
                      <span className="text-slate-500">{k.scopes.join(", ")}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-amber-200/90">
                  Full secret is only shown at creation — generate a new WooCommerce key if you no longer have it.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="rounded-xl border border-white/10 bg-black/25 p-4">
        <div className="flex items-start gap-3">
          <StepBadge done={Boolean(wooSecretPlain) || wooWebhooks.length > 0} n={3} />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">Webhook signing secret</h3>
            <p className="mt-1 text-xs text-slate-400">
              Register your store&apos;s{" "}
              <code className="text-cyan-200">/wp-json/odelhub-openpaygb/v1/webhook</code> endpoint with events{" "}
              <code className="text-cyan-200">charge.confirmed</code> (+ <code className="text-cyan-200">charge.failed</code>
              ). Paste the signing secret into WooCommerce.
            </p>
            <label className="mt-3 block text-xs text-slate-400">
              Your WooCommerce store base URL
              <input
                value={storeBase}
                onChange={(e) => {
                  setStoreBase(e.target.value);
                  try {
                    localStorage.setItem(
                      STORAGE_KEY,
                      JSON.stringify({ ...done, storeBase: e.target.value }),
                    );
                  } catch {
                    /* ignore */
                  }
                }}
                placeholder="https://shop.example.com"
                className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
              />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Webhook URL</span>
              <code className="break-all text-cyan-200">{webhookUrl}</code>
              <CopyTextButton text={webhookUrl} label="Copy URL" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void createWooWebhook()}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {busy === "webhook" ? "Registering…" : "Register WooCommerce webhook"}
              </button>
              <button
                type="button"
                onClick={onGoToWebhooks}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5"
              >
                Open Webhooks
              </button>
            </div>
            {wooSecretPlain ? (
              <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-950/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-amber-200">Signing secret — copy now</p>
                  <CopyTextButton text={wooSecretPlain} label="Copy secret" />
                </div>
                <code className="mt-2 block break-all text-xs text-white">{wooSecretPlain}</code>
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={done.webhookPasted}
                    onChange={(e) => persistDone({ ...done, webhookPasted: e.target.checked })}
                  />
                  Pasted into WooCommerce → Webhook signing secret
                </label>
              </div>
            ) : wooWebhooks.length > 0 ? (
              <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-3 text-xs text-slate-400">
                <p className="font-medium text-emerald-200">Registered WooCommerce webhooks</p>
                <ul className="mt-2 space-y-1">
                  {wooWebhooks.map((w) => (
                    <li key={w.id}>
                      <span className="text-white">{w.name}</span> ·{" "}
                      <span className="break-all font-mono text-slate-500">{w.url}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-amber-200/90">
                  Signing secret is only shown at creation — register again if you lost it (or rotate in Webhooks).
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Step 4 — paste sheet + flow */}
      <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4">
        <div className="flex items-start gap-3">
          <StepBadge done={checklistReady && done.keyPasted && done.webhookPasted} n={4} />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-cyan-100">Paste into WooCommerce settings</h3>
            <p className="mt-1 text-xs text-slate-400">
              WP Admin → WooCommerce → Settings → Payments → OpenPayGB
            </p>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                <div>
                  <dt className="text-slate-500">API base URL</dt>
                  <dd className="font-mono text-cyan-100">{apiBase}</dd>
                </div>
                <CopyTextButton text={apiBase} label="Copy" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                <div className="min-w-0">
                  <dt className="text-slate-500">Partner API key</dt>
                  <dd className="break-all font-mono text-cyan-100">
                    {wooKeyPlain ?? (lastKeyPrefix ? `${lastKeyPrefix}… (copy from step 2 when generated)` : "Generate in step 2")}
                  </dd>
                </div>
                {wooKeyPlain ? <CopyTextButton text={wooKeyPlain} label="Copy" /> : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                <div className="min-w-0">
                  <dt className="text-slate-500">Webhook signing secret</dt>
                  <dd className="break-all font-mono text-cyan-100">
                    {wooSecretPlain ?? "Generate in step 3"}
                  </dd>
                </div>
                {wooSecretPlain ? <CopyTextButton text={wooSecretPlain} label="Copy" /> : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                <div>
                  <dt className="text-slate-500">UGX conversion</dt>
                  <dd className="font-mono text-cyan-100">1</dd>
                </div>
                <CopyTextButton text="1" label="Copy" />
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Checkout flow */}
      <div className="rounded-xl border border-violet-500/25 bg-violet-950/15 p-4">
        <h3 className="text-sm font-semibold text-violet-100">Checkout flow (what runs at pay time)</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs text-slate-400">
          <li>
            Customer selects OpenPayGB at Woo checkout → plugin calls{" "}
            <code className="text-violet-200">POST /api/partner/v1/charges</code> with{" "}
            <code className="text-violet-200">Authorization: Bearer …</code>.
          </li>
          <li>
            Customer is redirected to hosted{" "}
            <code className="text-violet-200">{apiBase}/opgb/checkout/…</code> (MoMo / OPGB).
          </li>
          <li>
            On success, OpenPayGB delivers{" "}
            <code className="text-violet-200">charge.confirmed</code> to{" "}
            <code className="break-all text-violet-200">{webhookUrl}</code> (HMAC{" "}
            <code className="text-violet-200">X-Odelhub-Signature</code>) → Woo order marked paid.
          </li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/opgb#checkout"
            className="rounded-lg border border-violet-400/40 px-3 py-2 text-xs font-medium text-violet-100 hover:bg-violet-500/10"
          >
            Hosted checkout docs
          </Link>
          <Link
            href="/api/docs/platform/WOOCOMMERCE.md"
            className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
          >
            Full WOOCOMMERCE.md guide
          </Link>
          <Link
            href="/developers/dashboard#transactions"
            className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
          >
            View partner charges
          </Link>
        </div>
      </div>
    </div>
  );
}

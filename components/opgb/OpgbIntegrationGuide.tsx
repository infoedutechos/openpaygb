"use client";

import Link from "next/link";
import { useState } from "react";
import { CopyTextButton } from "@/components/ui/CopyTextButton";

const CURL_CREATE = `curl -X POST https://YOUR_HOST/api/partner/v1/charges \\
  -H "Authorization: Bearer odelhub_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amountUgx": 25000,
    "description": "Order #1042",
    "redirectUrl": "https://your-app.example/orders/1042/paid",
    "cancelUrl": "https://your-app.example/orders/1042",
    "externalRef": "ord_1042",
    "customerEmail": "buyer@example.com",
    "metadata": { "sku": "PRO-1" }
  }'`;

const CURL_GET = `curl https://YOUR_HOST/api/partner/v1/charges/CHARGE_ID \\
  -H "Authorization: Bearer odelhub_live_YOUR_KEY"`;

const WEBHOOK_VERIFY = `const crypto = require("crypto");
function verify(secret, rawBody, signatureHex) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signatureHex, "hex")
  );
}`;

const NODE_SDK_SNIPPET = `// Minimal Node helper (no SDK package required)
async function createCharge(apiKey, body) {
  const res = await fetch("https://YOUR_HOST/api/partner/v1/charges", {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  const { charge } = await res.json();
  // Redirect your customer:
  // window.location = charge.checkoutUrl
  return charge;
}`;

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/50">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {title ?? "Code"}
        </span>
        <CopyTextButton
          text={code}
          label="Copy"
          className="rounded-md border border-violet-400/40 px-2 py-0.5 text-[10px] text-violet-100 hover:bg-violet-500/20"
        />
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

export function OpgbIntegrationGuide() {
  const [openFaq, setOpenFaq] = useState<string | null>("scopes");

  return (
    <div id="integrate" className="scroll-mt-8 space-y-8">
      <section className="rounded-2xl border border-violet-500/25 bg-violet-950/20 p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">How other apps connect to OpenPayGB</h2>
        <p className="mt-2 text-sm text-slate-400">
          End-to-end path from registration to confirmed payment. Use this as your integration checklist.
        </p>
        <ol className="mt-5 space-y-4">
          {[
            {
              t: "1. Register a developer app",
              d: "Create an app at /developers/register. Save client_id and client_secret (copy buttons on the success screen).",
              href: "/developers/register",
            },
            {
              t: "2. Sign in & create a Partner API key",
              d: "Open the dashboard and generate a key with charges:create and charges:read (add payments:read / dex:* as needed).",
              href: "/developers/dashboard#api-keys",
            },
            {
              t: "3. Register webhooks",
              d: "Add your HTTPS endpoint and subscribe to charge.confirmed (and charge.failed). Verify X-Odelhub-Signature.",
              href: "/developers/dashboard#webhooks",
            },
            {
              t: "4. Create a charge from your backend",
              d: "POST /api/partner/v1/charges with amountUgx, description, redirectUrl, optional externalRef for idempotency.",
              href: "#charges",
            },
            {
              t: "5. Send the customer to hosted checkout",
              d: "Redirect to charge.checkoutUrl (/opgb/checkout/{id}). Customer pays with MTN or Airtel MoMo.",
              href: "#checkout",
            },
            {
              t: "6. Confirm via webhook or poll",
              d: "Treat charge.confirmed as source of truth. Optionally GET /api/partner/v1/charges/{id} to poll status.",
              href: "#webhooks",
            },
          ].map((step) => (
            <li key={step.t} className="rounded-xl border border-white/10 bg-[#0a101f] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-violet-100">{step.t}</p>
                <Link href={step.href} className="text-xs text-cyan-300 hover:underline">
                  Open →
                </Link>
              </div>
              <p className="mt-1 text-sm text-slate-400">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="charges" className="scroll-mt-8 rounded-2xl border border-white/10 bg-[#0a101f] p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">Create a merchant charge</h2>
        <p className="mt-2 text-sm text-slate-400">
          Scope required: <code className="text-violet-200">charges:create</code>. Auth:{" "}
          <code className="text-emerald-200">Authorization: Bearer odelhub_live_…</code>
        </p>
        <CodeBlock code={CURL_CREATE} title="POST /api/partner/v1/charges" />
        <p className="mt-3 text-xs text-slate-500">
          Response includes <code className="text-cyan-300">checkoutUrl</code>, <code className="text-cyan-300">id</code>,{" "}
          <code className="text-cyan-300">status</code>, and <code className="text-cyan-300">expiresAt</code> (1 hour).
          Reusing the same <code className="text-slate-400">externalRef</code> returns the existing charge (idempotent).
        </p>
        <CodeBlock code={CURL_GET} title="GET /api/partner/v1/charges/:id" />
        <CodeBlock code={NODE_SDK_SNIPPET} title="Node.js helper" />
      </section>

      <section id="checkout" className="scroll-mt-8 rounded-2xl border border-white/10 bg-[#0a101f] p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">Hosted checkout</h2>
        <p className="mt-2 text-sm text-slate-400">
          URL shape: <code className="text-cyan-200">/opgb/checkout/{"{chargeId}"}</code>. Branding comes from your
          developer app name. After payment, the payer is redirected to your{" "}
          <code className="text-slate-400">redirectUrl?chargeId=…&status=confirmed</code>.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-400">
          <li>Public read: <code className="text-xs">GET /api/public/charges/:id</code></li>
          <li>Start MoMo: <code className="text-xs">POST /api/public/charges/:id/livepay-start</code></li>
          <li>
            Sandbox (local / no LivePay): <code className="text-xs">POST /api/public/charges/:id/sandbox-confirm</code>
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Checkout stays available even if Dex hub is hidden — payment links never soft-404.
        </p>
      </section>

      <section id="webhooks" className="scroll-mt-8 rounded-2xl border border-white/10 bg-[#0a101f] p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">Webhooks</h2>
        <p className="mt-2 text-sm text-slate-400">
          Events: <code className="text-violet-200">charge.created</code>,{" "}
          <code className="text-violet-200">charge.confirmed</code>,{" "}
          <code className="text-violet-200">charge.failed</code> (plus tuition{" "}
          <code className="text-slate-400">payment.*</code> and Dex <code className="text-slate-400">dex.intent.*</code>).
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Headers: <code className="text-xs">X-Odelhub-Event</code>, <code className="text-xs">X-Odelhub-Signature</code>{" "}
          (HMAC-SHA256 of raw body).
        </p>
        <CodeBlock code={WEBHOOK_VERIFY} title="Verify signature (Node)" />
        <Link
          href="/developers/dashboard#webhooks"
          className="mt-4 inline-block text-sm text-cyan-300 hover:underline"
        >
          Configure endpoints in dashboard →
        </Link>
      </section>

      <section id="dex" className="scroll-mt-8 rounded-2xl border border-white/10 bg-[#0a101f] p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">Settlement, fees & white-label</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li>
            <strong className="text-slate-200">Fees</strong> — OpenPayGB sets a platform fee (default 2.5%, min 500 UGX).
            Your app chooses pass-through (customer pays) or absorb (deducted from your net), plus optional surcharge.
            Configure in{" "}
            <Link href="/developers/dashboard#fees" className="text-violet-300 hover:underline">
              Developers → Fees
            </Link>
            .
          </li>
          <li>
            <strong className="text-slate-200">Cashout</strong> — Confirmed charges credit settlement balance. Request MoMo
            cashout via dashboard or{" "}
            <code className="text-xs">POST /api/partner/v1/payouts</code> (<code className="text-xs">payouts:create</code>).
          </li>
          <li>
            <strong className="text-slate-200">White-label</strong> — Set name, logo, colors, and white-label mode so hosted
            checkout looks like your product. OpenPayGB can charge a one-time activation fee and/or an extra per-charge fee
            while white-label is on (configured by Master in the OPGB console).
          </li>
        </ul>
      </section>

      <section id="dex-oauth" className="scroll-mt-8 rounded-2xl border border-white/10 bg-[#0a101f] p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">Dex, OPGB balances & OAuth</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li>
            <strong className="text-slate-200">OAuth</strong> —{" "}
            <code className="text-xs">/api/oauth/authorize</code> +{" "}
            <code className="text-xs">POST /api/oauth/token</code> (client_credentials or authorization_code)
          </li>
          <li>
            <strong className="text-slate-200">Dex quotes / intents</strong> —{" "}
            <code className="text-xs">GET /api/partner/v1/dex/quote</code>,{" "}
            <code className="text-xs">POST /api/partner/v1/dex/payment-intents</code>
          </li>
          <li>
            <strong className="text-slate-200">OPGB balance read</strong> —{" "}
            <code className="text-xs">GET /api/partner/v1/opgb/balances?studentId=…</code>
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dex" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 hover:border-violet-400/40">
            Open Dex Hub
          </Link>
          <Link href="/api/docs/platform/OPENPAYGB_PAYMENT_PROVIDER.md" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 hover:border-violet-400/40">
            Provider docs
          </Link>
          <Link href="/api/docs/platform/PARTNER_API.md" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 hover:border-violet-400/40">
            Partner API markdown
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
        <h2 className="text-sm font-semibold text-white">FAQ</h2>
        {[
          {
            id: "scopes",
            q: "Which scopes do I need?",
            a: "For accepting payments: charges:create + charges:read. For cashout: payouts:create + payouts:read. Add payments:read for tuition payment history, opgb:balance:read for wallets, dex:intent:create for Dex flows.",
          },
          {
            id: "sandbox",
            q: "How do I test without LivePay?",
            a: "On localhost (or OPENPAYGB_CHARGES_SANDBOX=1), checkout shows “Sandbox: mark as paid”. Webhooks still fire charge.confirmed.",
          },
          {
            id: "tuition",
            q: "Is this the same as school tuition checkout?",
            a: "No. Merchant charges are app-scoped and not tied to students/programmes. School fees use /pay/{orgSlug} and tuition Partner payment APIs.",
          },
        ].map((item) => (
          <div key={item.id} className="mt-3 border-t border-white/10 pt-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-violet-100"
              onClick={() => setOpenFaq((v) => (v === item.id ? null : item.id))}
            >
              {item.q}
              <span className="text-slate-500">{openFaq === item.id ? "−" : "+"}</span>
            </button>
            {openFaq === item.id ? <p className="mt-2 text-sm text-slate-400">{item.a}</p> : null}
          </div>
        ))}
      </section>
    </div>
  );
}

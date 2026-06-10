/**
 * Print webhook URL + secret-configured status for Mbiyo, MoMo, LivePay.
 * Does NOT print secret values. Run: npm run webhooks:alignment-check
 */
const { config } = require("dotenv");
const { resolve } = require("node:path");

config({ path: resolve(process.cwd(), ".env.local") });
config();

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://odelpay.vercel.app").replace(/\/$/, "");

const providers = [
  {
    name: "Mbiyo",
    webhookUrl: `${appUrl}/api/webhooks/mbiyo`,
    secretEnv: "MBIYO_WEBHOOK_SECRET",
    dashboard: "https://dashboard.mbiyo.africa/user/profile/index/api",
    auth: "HMAC-SHA256 body → Signature / X-Signature",
  },
  {
    name: "MoMo bridge",
    webhookUrl: `${appUrl}/api/webhooks/momo`,
    secretEnv: "MOMO_WEBHOOK_SECRET",
    dashboard: "(upstream bridge operator)",
    auth: "x-momo-webhook-secret header",
  },
  {
    name: "LivePay",
    webhookUrl: process.env.LIVEPAY_WEBHOOK_URL?.trim() || `${appUrl}/api/webhooks/livepay`,
    secretEnv: "LIVEPAY_WEBHOOK_SECRET",
    dashboard: "https://livepay.me/",
    auth: "X-Webhook-Signature HMAC",
  },
];

console.log("Webhook secrets alignment checklist");
console.log("===================================");
console.log(`App URL: ${appUrl}`);
console.log("");

let allOk = true;
for (const p of providers) {
  const configured = Boolean(process.env[p.secretEnv]?.trim());
  if (!configured) allOk = false;
  console.log(`${p.name}`);
  console.log(`  Webhook URL:     ${p.webhookUrl}`);
  console.log(`  Env var:         ${p.secretEnv}`);
  console.log(`  Secret set:      ${configured ? "YES" : "NO — run deployment:provision-sync or set manually"}`);
  console.log(`  Dashboard:       ${p.dashboard}`);
  console.log(`  Auth:            ${p.auth}`);
  console.log(`  Action:          Paste webhook URL + matching ${p.secretEnv} into dashboard`);
  console.log("");
}

console.log(allOk ? "All webhook secrets configured in env." : "Some secrets missing — align after provisioning.");
console.log("Docs: docs/WEBHOOK_SECRETS_ALIGNMENT.md");
console.log("API:  GET /api/public/webhook-alignment");

process.exit(allOk ? 0 : 1);

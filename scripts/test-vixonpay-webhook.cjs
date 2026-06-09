/**
 * Smoke-test VixonPay webhook signature + route.
 * Usage:
 *   node scripts/test-vixonpay-webhook.cjs
 *   node scripts/test-vixonpay-webhook.cjs https://your-tunnel.trycloudflare.com
 */
const { createHmac } = require("node:crypto");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const secret = process.env.VIXONPAY_WEBHOOK_SECRET;
if (!secret) {
  console.error("VIXONPAY_WEBHOOK_SECRET is not set in .env.local");
  process.exit(1);
}

const base =
  process.argv[2]?.replace(/\/$/, "") ||
  (process.env.VIXONPAY_WEBHOOK_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
const url = `${base}/api/webhooks/vixonpay`;

const body = JSON.stringify({
  event: "transaction.completed",
  data: {
    merchant_reference: "000000000000000000000000",
    internal_reference: "VXN-TEST-WEBHOOK",
    transaction_status: "Completed",
    transaction_amount: "50000.00",
    request_currency: "UGX",
  },
});

const sig = createHmac("sha512", secret).update(body, "utf8").digest("hex");

async function main() {
  console.log("POST", url);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-VixonPay-Signature": sig,
    },
    body,
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

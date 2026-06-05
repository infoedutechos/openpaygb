/**
 * Autonomous Relworx integration smoke test.
 * Usage: node scripts/relworx-smoke.cjs
 * Env: TEST_BASE_URL (default http://localhost:3000)
 */
require("./load-env.cjs");

const { createHmac } = require("node:crypto");

const BASE = (process.env.TEST_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const results = { pass: [], fail: [], warn: [] };

function pass(msg) {
  results.pass.push(msg);
  console.log(`PASS ${msg}`);
}
function fail(msg, detail) {
  const line = detail ? `${msg} — ${detail}` : msg;
  results.fail.push(line);
  console.error(`FAIL ${line}`);
}
function warn(msg) {
  results.warn.push(msg);
  console.warn(`WARN ${msg}`);
}

function relworxWebhookUrl() {
  const explicit = process.env.RELWORX_WEBHOOK_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/webhooks/relworx`;
}

function signRelworxWebhook(key, timestamp, url, payload) {
  const keys = Object.keys(payload).sort();
  let signed = url + timestamp;
  for (const k of keys) signed += k + payload[k];
  return createHmac("sha256", key).update(signed, "utf8").digest("hex");
}

async function fetchJson(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: "follow", ...opts });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json, text, url };
}

async function testEnv() {
  const required = ["RELWORX_API_KEY", "RELWORX_ACCOUNT_NO", "RELWORX_WEBHOOK_KEY", "NEXT_PUBLIC_APP_URL"];
  for (const k of required) {
    if (process.env[k]?.trim()) pass(`env ${k}`);
    else fail(`env ${k}`, "missing");
  }
}

function testSignatureLocal() {
  const url = "https://pay.example.com/api/webhooks/relworx";
  const key = "test-webhook-key";
  const timestamp = "1561370460";
  const payload = {
    status: "success",
    customer_reference: "shdfjsue789sh8jshuehu",
    internal_reference: "jshfufehkshffkseuhfskahakhuefak",
  };
  const v = signRelworxWebhook(key, timestamp, url, payload);
  const header = `t=${timestamp},v=${v}`;
  let received = "";
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === "v") received = part.slice(eq + 1).trim();
  }
  const keys = Object.keys(payload).sort();
  let signed = url + timestamp;
  for (const k of keys) signed += k + payload[k];
  const expected = createHmac("sha256", key).update(signed, "utf8").digest("hex");
  if (expected === received) pass("local HMAC signature round-trip");
  else fail("local HMAC signature", "mismatch");
}

async function testRelworxConfigApi() {
  const { res, json } = await fetchJson("/api/public/relworx-config");
  if (res.status !== 200) return fail("GET /api/public/relworx-config", `status ${res.status}`);
  if (!json?.enabled) return fail("relworx-config", "enabled=false");
  pass("relworx-config enabled=true");
  if (json.currency === "UGX") pass("relworx-config currency UGX");
  else warn(`relworx-config currency ${json.currency}`);
  if (json.webhookKeyConfigured) pass("relworx-config webhookKeyConfigured");
  else fail("relworx-config", "webhookKeyConfigured=false");
  if (json.webhookUrl) pass(`relworx-config webhookUrl ${json.webhookUrl}`);
  else warn("relworx-config webhookUrl null");
}

async function testWebhookGetProbe() {
  const { res } = await fetchJson("/api/webhooks/relworx");
  if (res.status === 200) pass("GET /api/webhooks/relworx → 200");
  else fail("GET /api/webhooks/relworx", `status ${res.status}`);
}

async function testRelworxApiAuth() {
  const apiKey = process.env.RELWORX_API_KEY?.trim();
  const accountNo = process.env.RELWORX_ACCOUNT_NO?.trim();
  if (!apiKey || !accountNo) return warn("Relworx live API probe skipped — keys missing");

  const qs = new URLSearchParams({
    account_no: accountNo,
    internal_reference: "smoke-test-nonexistent-ref",
  });
  try {
    const res = await fetch(
      `https://payments.relworx.com/api/mobile-money/check-request-status?${qs}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/vnd.relworx.v2",
        },
      },
    );
    const text = await res.text();
    if (res.status === 401) {
      fail("Relworx API auth", "401 Unauthorized — check RELWORX_API_KEY");
      return;
    }
    if (/API_DISABLED|API disabled for this account/i.test(text)) {
      warn("Relworx API disabled for this business account — contact Relworx support to enable API access");
      return;
    }
    if (res.status === 403 || /IP|allowlist|not authorized/i.test(text)) {
      warn(`Relworx API IP/auth restriction (${res.status}) — whitelist public IP in dashboard`);
      return;
    }
    if (res.status >= 200 && res.status < 500) {
      pass(`Relworx API reachable (check-status ${res.status})`);
    } else {
      fail("Relworx API", `status ${res.status}`);
    }
  } catch (e) {
    fail("Relworx API", e instanceof Error ? e.message : String(e));
  }
}

async function testWebhookConfirmFlow() {
  const webhookKey = process.env.RELWORX_WEBHOOK_KEY?.trim();
  const webhookUrl = relworxWebhookUrl();
  if (!webhookKey || !webhookUrl) {
    warn("Webhook confirm flow skipped — RELWORX_WEBHOOK_KEY or webhook URL missing");
    return;
  }

  const { PrismaClient, PaymentRail, PaymentStatus } = await import("@prisma/client");
  const prisma = new PrismaClient();
  let paymentId = null;

  try {
    const org = await prisma.organization.findFirst({
      where: { tenantStatus: "active" },
      orderBy: { createdAt: "asc" },
    });
    if (!org) {
      warn("Webhook confirm flow skipped — no active organization (run npm run seed)");
      return;
    }

    let student = await prisma.student.findFirst({
      where: { organizationId: org.id },
      orderBy: { createdAt: "asc" },
    });
    if (!student) {
      student = await prisma.student.create({
        data: {
          organizationId: org.id,
          name: "Relworx Smoke Test",
          email: `relworx-smoke-${Date.now()}@example.com`,
          phone: "+256700000001",
          programmeCode: "BSC",
          year: 1,
          semester: 1,
        },
      });
    }

    const payment = await prisma.payment.create({
      data: {
        organizationId: org.id,
        studentId: student.id,
        programmeCode: student.programmeCode || "BSC",
        year: student.year || 1,
        semester: student.semester || 1,
        tuitionUgx: 500,
        functionalFeesUgx: 0,
        platformFeeUgx: 0,
        totalUgx: 500,
        ugxPerTonSnapshot: Number(process.env.DEFAULT_UGX_PER_TON) || 257000,
        tonAmount: 0,
        destinationWallet: org.destinationWallet?.trim() || process.env.ODELHUB_TON_WALLET_ADDRESS?.trim() || "",
        rail: PaymentRail.relworx,
        status: PaymentStatus.pending,
        momoReference: "smoke-internal-ref",
      },
    });
    paymentId = payment.id;

    const payload = {
      status: "success",
      request_status: "success",
      customer_reference: payment.id,
      internal_reference: "smoke-internal-ref",
      amount: 500,
      currency: "UGX",
    };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const sigPayload = {
      status: payload.status,
      customer_reference: payload.customer_reference,
      internal_reference: payload.internal_reference,
    };
    const v = signRelworxWebhook(webhookKey, timestamp, webhookUrl, sigPayload);
    const { res, json } = await fetchJson("/api/webhooks/relworx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Relworx-Signature": `t=${timestamp},v=${v}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status !== 200) {
      fail("POST webhook confirm", `status ${res.status} ${JSON.stringify(json)}`);
      return;
    }
    if (json?.action === "confirmed" || json?.action === "already_confirmed") {
      pass(`webhook confirm action=${json.action}`);
    } else {
      fail("POST webhook confirm", `unexpected action ${json?.action}`);
      return;
    }

    const updated = await prisma.payment.findUnique({ where: { id: payment.id } });
    if (updated?.status === "confirmed") pass("payment status confirmed in DB");
    else fail("payment DB status", updated?.status ?? "missing");

    const pub = await fetchJson(`/api/payments/${payment.id}/public`);
    if (pub.res.status === 200 && pub.json?.payment?.status === "confirmed") {
      pass("GET /api/payments/:id/public → confirmed");
    } else {
      fail("public payment poll", `status ${pub.res.status} ${pub.text?.slice(0, 120)}`);
    }
  } catch (e) {
    fail("webhook confirm flow", e instanceof Error ? e.message : String(e));
  } finally {
    if (paymentId) {
      await prisma.payment.deleteMany({ where: { id: paymentId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

async function main() {
  console.log(`\n[relworx-smoke] BASE=${BASE}\n`);
  await testEnv();
  testSignatureLocal();

  let serverUp = false;
  try {
    const { res } = await fetchJson("/api/health");
    serverUp = res.status === 200 || res.status === 503;
  } catch {
    serverUp = false;
  }

  if (!serverUp) {
    fail("dev server", "not reachable — run npm run dev and retry");
    console.log(`\n--- Summary: ${results.pass.length} pass, ${results.warn.length} warn, ${results.fail.length} fail ---\n`);
    process.exit(1);
  }
  pass("dev server reachable");

  await testRelworxConfigApi();
  await testWebhookGetProbe();
  await testRelworxApiAuth();
  await testWebhookConfirmFlow();

  console.log(`\n--- Summary: ${results.pass.length} pass, ${results.warn.length} warn, ${results.fail.length} fail ---\n`);
  if (results.fail.length) process.exit(1);
  if (results.warn.length) console.log("[relworx-smoke] Completed with warnings.\n");
  else console.log("[relworx-smoke] All checks passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Holistic ecosystem smoke test (tuition + public APIs + webhooks).
 * Usage: node scripts/ecosystem-smoke.cjs
 * Env: TEST_BASE_URL (default http://localhost:3000)
 */
require("./load-env.cjs");

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

async function fetchJson(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: "follow", ...opts });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json, text, url };
}

async function expectStatus(path, status, label) {
  const { res } = await fetchJson(path);
  if (res.status === status) pass(`${label || path} → ${status}`);
  else fail(`${label || path}`, `expected ${status}, got ${res.status}`);
}

async function testServerUp() {
  try {
    const { res } = await fetchJson("/api/health");
    if (res.status === 200 || res.status === 503) {
      pass(`dev server reachable (${res.status})`);
      return true;
    }
    fail("dev server", `health status ${res.status}`);
    return false;
  } catch (e) {
    fail("dev server", e instanceof Error ? e.message : String(e));
    return false;
  }
}

async function testHealthAndDb() {
  const { res, json } = await fetchJson("/api/health");
  if (res.status === 200 && json?.ok && json?.db === "connected") {
    pass("MongoDB via /api/health");
  } else if (res.status === 503) {
    warn(`MongoDB not connected (${json?.db ?? "unknown"}) — Atlas/network`);
  } else {
    fail("/api/health", JSON.stringify(json));
  }
}

async function testDeploymentEnvApi() {
  const { res, json } = await fetchJson("/api/master/deployment-env");
  if (res.status === 401 || res.status === 403) {
    warn("deployment-env API requires master session — skip when unauthenticated");
    return;
  }
  if (res.status !== 200) return fail("deployment-env", `status ${res.status}`);
  if (!json?.summary || !Array.isArray(json?.groups)) return fail("deployment-env", "invalid shape");
  pass(`deployment-env API (${json.summary.setVars}/${json.summary.totalVars} vars set)`);
}

async function testLivePayConfig() {
  const { res, json } = await fetchJson("/api/public/livepay-config");
  if (res.status !== 200) return fail("livepay-config", `status ${res.status}`);
  if (!json?.enabled) {
    warn("LivePay disabled — set LIVEPAY_API_KEY + LIVEPAY_ACCOUNT_NUMBER in .env.local");
  } else {
    pass("LivePay enabled");
    if (json.webhookUrl) pass(`LivePay webhookUrl: ${json.webhookUrl}`);
    else warn("LivePay webhookUrl null — set NEXT_PUBLIC_APP_URL or LIVEPAY_WEBHOOK_URL");
    if (json.webhookSecretConfigured) pass("LivePay webhook secret configured");
    else warn("LIVEPAY_WEBHOOK_SECRET unset — required in production");
  }
  if (Array.isArray(json?.networks) && json.networks.includes("MTN")) {
    pass("LivePay networks MTN/AIRTEL");
  }
}

async function testWebhookProbes() {
  await expectStatus("/api/webhooks/livepay", 200, "LivePay webhook GET probe");
  await expectStatus("/api/webhooks/mbiyo", 200, "Mbiyo webhook GET probe");
}

async function testPublicPages() {
  const pages = [
    ["/", "home"],
    ["/pay", "pay index"],
    ["/pay/default", "pay default tenant"],
    ["/school/login", "school login"],
    ["/admin/login", "admin login"],
    ["/admin/register", "workspace register"],
    ["/student/login", "student login"],
    ["/api/public/livepay-config", "livepay config API"],
  ];
  for (const [path, label] of pages) {
    const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
    if (res.status === 200) pass(`page ${label}`);
    else fail(`page ${label}`, `status ${res.status}`);
  }
}

async function testWorkspaceStatus() {
  const { res, json } = await fetchJson("/api/public/workspace-status?slug=default");
  if (res.status === 200 && json && "tenantStatus" in json) {
    pass(`workspace-status default → ${json.tenantStatus}`);
  } else if (res.status === 404) {
    warn("workspace-status default — org missing (run npm run seed)");
  } else {
    fail("workspace-status", `status ${res.status}`);
  }
}

async function testDeprecatedCollect() {
  const res = await fetch(`${BASE}/api/collect/momo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  if (res.status === 410) pass("legacy POST /api/collect/momo → 410");
  else warn(`legacy collect/momo status ${res.status} (expected 410)`);
}

async function testAuthMe() {
  const { res, json } = await fetchJson("/api/auth/me");
  if (res.status === 200 && json && "tuitionSession" in json && "adminShellAccess" in json) {
    pass("GET /api/auth/me shape");
  } else {
    fail("/api/auth/me", `status ${res.status}`);
  }
}

async function testEnvConfig() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  const tuition = ["NEXT_PUBLIC_APP_URL"];
  const livepay = ["LIVEPAY_API_KEY", "LIVEPAY_ACCOUNT_NUMBER"];
  const prodEmailFrom = ["TRANSACTIONAL_EMAIL_FROM", "RESEND_FROM"];

  for (const k of required) {
    if (process.env[k]?.trim()) pass(`env ${k}`);
    else fail(`env ${k}`, "missing");
  }
  for (const k of tuition) {
    if (process.env[k]?.trim()) pass(`env ${k}`);
    else warn(`env ${k} unset — verify links / LivePay webhook signature may fail`);
  }
  for (const k of livepay) {
    if (process.env[k]?.trim()) pass(`env ${k}`);
    else warn(`env ${k} unset`);
  }
  const hasEmailProvider =
    process.env.BREVO_API_KEY?.trim() || process.env.RESEND_API_KEY?.trim();
  const hasEmailFrom = prodEmailFrom.some((k) => process.env[k]?.trim());
  if (hasEmailProvider && hasEmailFrom) {
    pass("env transactional email (Brevo or Resend + from)");
  } else {
    warn("env BREVO_API_KEY or RESEND_API_KEY + TRANSACTIONAL_EMAIL_FROM unset — dev verification link fallback");
  }
}

async function main() {
  console.log(`\n[ecosystem-smoke] BASE=${BASE}\n`);
  await testEnvConfig();
  const up = await testServerUp();
  if (!up) {
    console.log("\n[ecosystem-smoke] Start dev: npm run dev:clean\n");
    process.exit(1);
  }
  await testHealthAndDb();
  await testDeploymentEnvApi();
  await testLivePayConfig();
  await testWebhookProbes();
  await testAuthMe();
  await testWorkspaceStatus();
  await testDeprecatedCollect();
  await testPublicPages();

  console.log(`\n--- Summary: ${results.pass.length} pass, ${results.warn.length} warn, ${results.fail.length} fail ---\n`);
  if (results.fail.length) process.exit(1);
  if (results.warn.length) console.log("[ecosystem-smoke] Completed with warnings.\n");
  else console.log("[ecosystem-smoke] All checks passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

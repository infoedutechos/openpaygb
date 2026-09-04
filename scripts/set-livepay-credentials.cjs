/**
 * Set LivePay (ODeLPay) collect credentials in Master overrides, .env.local, and Vercel production.
 *
 * Usage (PowerShell):
 *   $env:LIVEPAY_API_KEY="…"; $env:LIVEPAY_ACCOUNT_NUMBER="…"; $env:LIVEPAY_WEBHOOK_SECRET="…"; node scripts/set-livepay-credentials.cjs
 *
 * Optional: LIVEPAY_KEY_ID (dashboard label only — not used by the API client).
 */
const { createCipheriv, createHash, randomBytes } = require("node:crypto");
const { readFileSync, writeFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { spawn } = require("node:child_process");
const { config } = require("dotenv");

config({ path: resolve(process.cwd(), ".env.local") });
config();

if (!process.env.DATABASE_URL?.trim() && process.env.MONGODB_URI?.trim()) {
  process.env.DATABASE_URL = process.env.MONGODB_URI.trim();
}

const KEYS = ["LIVEPAY_API_KEY", "LIVEPAY_ACCOUNT_NUMBER", "LIVEPAY_WEBHOOK_SECRET"];

function encryptionKey() {
  const secret = process.env.JWT_SECRET?.trim() || "odelhub-dev-deployment-env-key";
  return createHash("sha256").update(`odelhub-deployment-env:${secret}`, "utf8").digest();
}

function encryptDeploymentEnvValue(plaintext) {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

function readProjectJson() {
  const raw = readFileSync(resolve(process.cwd(), ".vercel/project.json"), "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed.projectId || !parsed.orgId) {
    throw new Error("Missing projectId/orgId in .vercel/project.json");
  }
  return { projectId: parsed.projectId, orgId: parsed.orgId };
}

function vercelCliEnv() {
  const { projectId, orgId } = readProjectJson();
  return { ...process.env, VERCEL_ORG_ID: orgId, VERCEL_PROJECT_ID: projectId };
}

function vercelEnvRm(key, target) {
  return new Promise((resolvePromise) => {
    const child = spawn("npx", ["vercel", "env", "rm", key, target, "--yes"], {
      cwd: process.cwd(),
      shell: true,
      stdio: "ignore",
      env: vercelCliEnv(),
    });
    child.on("close", () => resolvePromise());
    child.on("error", () => resolvePromise());
  });
}

function vercelEnvAdd(key, value, target) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("npx", ["vercel", "env", "add", key, target, "--yes"], {
      cwd: process.cwd(),
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: vercelCliEnv(),
    });
    let err = "";
    child.stderr?.on("data", (d) => {
      err += String(d);
    });
    child.stdin.write(value);
    child.stdin.end();
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`vercel env add ${key} failed: ${err.slice(0, 400)}`));
    });
    child.on("error", reject);
  });
}

async function patchMasterOverrides(updates) {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  const saved = [];
  try {
    for (const [name, value] of Object.entries(updates)) {
      const trimmed = String(value).trim();
      if (!trimmed) continue;
      await prisma.deploymentEnvOverride.upsert({
        where: { name },
        create: {
          name,
          valueEnc: encryptDeploymentEnvValue(trimmed),
          sensitive: true,
          updatedBy: "set-livepay-credentials",
        },
        update: {
          valueEnc: encryptDeploymentEnvValue(trimmed),
          sensitive: true,
          updatedBy: "set-livepay-credentials",
        },
      });
      saved.push(name);
    }
  } finally {
    await prisma.$disconnect();
  }
  return saved;
}

async function main() {
  const values = {};
  for (const key of KEYS) {
    const v = process.env[key]?.trim();
    if (!v) throw new Error(`Missing ${key}`);
    values[key] = v;
  }

  const keyId = process.env.LIVEPAY_KEY_ID?.trim();
  if (keyId) {
    values.LIVEPAY_KEY_ID = keyId;
    console.log(`Key ID (dashboard label): ${keyId}`);
  }

  // 1) .env.local
  const envPath = resolve(process.cwd(), ".env.local");
  let envContent = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  for (const [k, v] of Object.entries(values)) {
    envContent = upsertEnvLine(envContent, k, v);
  }
  if (keyId) envContent = upsertEnvLine(envContent, "LIVEPAY_KEY_ID", keyId);
  writeFileSync(envPath, envContent, "utf8");
  console.log("Updated .env.local (gitignored)");

  // 2) Master Admin encrypted overrides (runtime on app if JWT_SECRET matches)
  if (!process.env.DATABASE_URL?.trim()) {
    console.warn("DATABASE_URL missing — skipped Master Admin Mongo overrides");
  } else {
    const saved = await patchMasterOverrides(values);
    console.log(`Saved Master overrides: ${saved.join(", ")}`);
  }

  // 3) Vercel production
  console.log("Syncing to Vercel production…");
  for (const [key, value] of Object.entries(values)) {
    await vercelEnvRm(key, "production");
    await vercelEnvAdd(key, value, "production");
    console.log(`  ok ${key}`);
  }

  console.log("\nDone.");
  console.log("Webhook URL for LivePay dashboard:");
  console.log("  https://odelpay.vercel.app/api/webhooks/livepay");
  console.log("Redeploy so process.env picks up new Vercel secrets:");
  console.log("  npx vercel deploy --prod --yes");
  console.log("Verify: GET https://odelpay.vercel.app/api/public/livepay-config");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

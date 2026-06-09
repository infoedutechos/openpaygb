/**
 * Provision production deployment secrets, save to Master Admin overrides,
 * update local .env, and push to Vercel via CLI session.
 *
 * Usage: node scripts/provision-and-sync-deployment-env.cjs
 */
const { randomBytes, createCipheriv, createHash } = require("node:crypto");
const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { spawn } = require("node:child_process");
const { config } = require("dotenv");

config({ path: resolve(process.cwd(), ".env.local") });
config();

if (!process.env.DATABASE_URL?.trim() && process.env.MONGODB_URI?.trim()) {
  process.env.DATABASE_URL = process.env.MONGODB_URI.trim();
}

const PRODUCTION_APP_URL = "https://odelpay.vercel.app";

const SECRET_KEYS = [
  "HEALTH_CHECK_SECRET",
  "CRON_SECRET",
  "MOMO_WEBHOOK_SECRET",
  "MBIYO_WEBHOOK_SECRET",
  "TELEGRAM_WEBHOOK_SECRET",
  "LIVEPAY_WEBHOOK_SECRET",
  "RELWORX_WEBHOOK_KEY",
  "VIXONPAY_WEBHOOK_SECRET",
];

function randomSecret(prefix) {
  return `${prefix}${randomBytes(24).toString("hex")}`;
}

function needsProductionSecret(name, value) {
  const v = (value ?? "").trim();
  if (!v) return true;
  if (v.startsWith("dev_")) return true;
  if (v.startsWith("REPLACE_")) return true;
  return false;
}

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

function loadRegistryNames() {
  const raw = readFileSync(resolve(process.cwd(), "lib/deployment-env-registry.ts"), "utf8");
  const names = new Set();
  for (const m of raw.matchAll(/name:\s*"([A-Z][A-Z0-9_]*)"/g)) {
    names.add(m[1]);
  }
  return [...names];
}

function readProjectJson() {
  const raw = readFileSync(resolve(process.cwd(), ".vercel/project.json"), "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed.projectId || !parsed.orgId) {
    throw new Error("Missing projectId/orgId in .vercel/project.json");
  }
  return { projectId: parsed.projectId, orgId: parsed.orgId };
}

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

function loadSensitiveByName() {
  const raw = readFileSync(resolve(process.cwd(), "lib/deployment-env-registry.ts"), "utf8");
  const map = new Map();
  const blocks = raw.split(/name:\s*"/);
  for (const block of blocks.slice(1)) {
    const name = block.split('"')[0];
    const sensitive = /sensitive:\s*true/.test(block.slice(0, 400));
    map.set(name, sensitive);
  }
  return map;
}

async function patchMasterOverrides(updates) {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  const sensitiveByName = loadSensitiveByName();
  const saved = [];
  try {
    for (const [name, value] of Object.entries(updates)) {
      const trimmed = String(value).trim();
      if (!trimmed || !sensitiveByName.has(name)) continue;
      const sensitive = sensitiveByName.get(name) ?? !name.startsWith("NEXT_PUBLIC_");
      await prisma.deploymentEnvOverride.upsert({
        where: { name },
        create: {
          name,
          valueEnc: encryptDeploymentEnvValue(trimmed),
          sensitive,
          updatedBy: "provision-and-sync-deployment-env",
        },
        update: {
          valueEnc: encryptDeploymentEnvValue(trimmed),
          sensitive,
          updatedBy: "provision-and-sync-deployment-env",
        },
      });
      saved.push(name);
    }
  } finally {
    await prisma.$disconnect();
  }
  return saved;
}

function vercelEnvRm(key, target) {
  return new Promise((resolvePromise) => {
    const child = spawn("npx", ["vercel", "env", "rm", key, target, "--yes"], {
      cwd: process.cwd(),
      shell: true,
      stdio: "ignore",
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
    });
    let err = "";
    child.stderr?.on("data", (d) => {
      err += String(d);
    });
    child.stdin.write(value);
    child.stdin.end();
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`vercel env add ${key} failed: ${err.slice(0, 300)}`));
    });
    child.on("error", reject);
  });
}

async function syncViaCli(values) {
  const skip = new Set([
    "VERCEL_ACCESS_TOKEN",
    "VERCEL_PROJECT_ID",
    "VERCEL_TEAM_ID",
    "DEPLOYMENT_ENV_AUTONOMOUS_SYNC",
    "NODE_ENV",
    "VERCEL_ENV",
  ]);
  const errors = [];
  let synced = 0;
  for (const [key, value] of Object.entries(values).sort(([a], [b]) => a.localeCompare(b))) {
    if (skip.has(key) || !String(value).trim()) continue;
    try {
      await vercelEnvRm(key, "production");
      await vercelEnvAdd(key, String(value).trim(), "production");
      synced += 1;
      process.stdout.write(`  ok ${key}\n`);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `${key}: failed`);
      process.stdout.write(`  fail ${key}\n`);
    }
  }
  return { synced, errors };
}

async function main() {
  const syncOnly = process.argv.includes("--sync-only");
  const { projectId, orgId } = readProjectJson();
  let envContent = readFileSync(resolve(process.cwd(), ".env"), "utf8");

  if (syncOnly) {
    const registryNames = new Set(loadRegistryNames());
    const values = {};
    for (const name of registryNames) {
      const value = process.env[name]?.trim();
      if (value) values[name] = value;
    }
    console.log("Sync-only mode — pushing registry values to Vercel production…");
    const cli = await syncViaCli(values);
    console.log(`CLI sync: ${cli.synced} variable(s).`);
    if (cli.errors.length) console.warn("Errors:\n", cli.errors.join("\n"));
    return;
  }

  for (const key of SECRET_KEYS) {
    const current = process.env[key]?.trim() ?? "";
    if (needsProductionSecret(key, current)) {
      const prefix =
        key === "HEALTH_CHECK_SECRET"
          ? "hc_"
          : key === "CRON_SECRET"
            ? "prod_cron_"
            : `prod_${key.toLowerCase().replace(/_secret$|_key$/, "")}_`;
      const value = randomSecret(prefix);
      process.env[key] = value;
      envContent = upsertEnvLine(envContent, key, value);
    }
  }

  envContent = upsertEnvLine(envContent, "NEXT_PUBLIC_APP_URL", PRODUCTION_APP_URL);
  process.env.NEXT_PUBLIC_APP_URL = PRODUCTION_APP_URL;

  const vercelMeta = {
    VERCEL_PROJECT_ID: projectId,
    VERCEL_TEAM_ID: orgId,
    DEPLOYMENT_ENV_AUTONOMOUS_SYNC: "true",
  };
  // Master Admin overrides only — do not write VERCEL_PROJECT_ID to .env (breaks linked CLI).
  for (const [k, v] of Object.entries(vercelMeta)) {
    process.env[k] = v;
  }
  envContent = envContent
    .replace(/^VERCEL_PROJECT_ID=.*\n?/m, "")
    .replace(/^VERCEL_TEAM_ID=.*\n?/m, "");

  writeFileSync(resolve(process.cwd(), ".env"), envContent, "utf8");
  console.log("Updated .env");

  const registryNames = new Set(loadRegistryNames());
  const overrideUpdates = { ...vercelMeta };
  for (const name of registryNames) {
    const value = process.env[name]?.trim();
    if (value) overrideUpdates[name] = value;
  }

  const saved = await patchMasterOverrides(overrideUpdates);
  console.log(`Saved ${saved.length} Master Admin override(s).`);

  console.log("\nSyncing to Vercel production…");
  const cli = await syncViaCli(overrideUpdates);
  console.log(`CLI sync: ${cli.synced} variable(s).`);
  if (cli.errors.length) console.warn("Errors:\n", cli.errors.join("\n"));

  console.log("\nDone. Secret keys provisioned:", SECRET_KEYS.join(", "));
  if (process.env.ODELHUB_TON_WALLET_ADDRESS?.includes("replace_with_real")) {
    console.warn("ODELHUB_TON_WALLET_ADDRESS is still a placeholder — set a real wallet in Master Admin.");
  }
  console.log(`\nVercel credentials for Master Admin API sync:`);
  console.log(`  VERCEL_PROJECT_ID = ${projectId}  (Project → Settings → General)`);
  console.log(`  VERCEL_TEAM_ID    = ${orgId}  (Team Settings → General)`);
  console.log(`  VERCEL_ACCESS_TOKEN = https://vercel.com/account/tokens (logged in as infoedutechos)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

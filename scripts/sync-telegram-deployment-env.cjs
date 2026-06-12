/**
 * Save TELEGRAM_BOT_TOKEN to Master Admin overrides and push to Vercel production.
 *
 * Usage: node scripts/sync-telegram-deployment-env.cjs
 * Requires: DATABASE_URL, JWT_SECRET, TELEGRAM_BOT_TOKEN, VERCEL_ACCESS_TOKEN (optional for Vercel CLI)
 */
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { spawn } = require("node:child_process");
const { config } = require("dotenv");

config({ path: resolve(process.cwd(), ".env.local") });
config();

if (!process.env.DATABASE_URL?.trim() && process.env.MONGODB_URI?.trim()) {
  process.env.DATABASE_URL = process.env.MONGODB_URI.trim();
}

const { randomBytes, createCipheriv, createHash } = require("node:crypto");

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

function readProjectJson() {
  const raw = readFileSync(resolve(process.cwd(), ".vercel/project.json"), "utf8");
  const parsed = JSON.parse(raw);
  return { projectId: parsed.projectId, orgId: parsed.orgId };
}

function vercelCliEnv() {
  const { projectId, orgId } = readProjectJson();
  const env = { ...process.env };
  env.VERCEL_ORG_ID = orgId;
  env.VERCEL_PROJECT_ID = projectId;
  return env;
}

function vercelEnvAdd(key, value) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("npx", ["vercel", "env", "add", key, "production", "--yes"], {
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
      else reject(new Error(`vercel env add ${key} failed: ${err.slice(0, 300)}`));
    });
    child.on("error", reject);
  });
}

function vercelEnvRm(key) {
  return new Promise((resolvePromise) => {
    const child = spawn("npx", ["vercel", "env", "rm", key, "production", "--yes"], {
      cwd: process.cwd(),
      shell: true,
      stdio: "ignore",
      env: vercelCliEnv(),
    });
    child.on("close", () => resolvePromise());
    child.on("error", () => resolvePromise());
  });
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

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || process.env.BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("Set TELEGRAM_BOT_TOKEN (or BOT_TOKEN) in .env / .env.local");
  }
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("Set DATABASE_URL for Master Admin override save");
  }

  const sensitiveByName = loadSensitiveByName();
  if (!sensitiveByName.has("TELEGRAM_BOT_TOKEN")) {
    throw new Error("TELEGRAM_BOT_TOKEN not in deployment-env-registry.ts");
  }

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.deploymentEnvOverride.upsert({
      where: { name: "TELEGRAM_BOT_TOKEN" },
      create: {
        name: "TELEGRAM_BOT_TOKEN",
        valueEnc: encryptDeploymentEnvValue(token),
        sensitive: sensitiveByName.get("TELEGRAM_BOT_TOKEN") ?? true,
        updatedBy: "sync-telegram-deployment-env",
      },
      update: {
        valueEnc: encryptDeploymentEnvValue(token),
        sensitive: sensitiveByName.get("TELEGRAM_BOT_TOKEN") ?? true,
        updatedBy: "sync-telegram-deployment-env",
      },
    });
    console.log("Saved TELEGRAM_BOT_TOKEN to Master Admin overrides.");
  } finally {
    await prisma.$disconnect();
  }

  const vercelToken = process.env.VERCEL_ACCESS_TOKEN?.trim();
  if (!vercelToken) {
    console.warn("VERCEL_ACCESS_TOKEN not set — skipped Vercel env push. Use Master Admin Sync or set token.");
    return;
  }

  process.env.VERCEL_ACCESS_TOKEN = vercelToken;
  try {
    await vercelEnvRm("TELEGRAM_BOT_TOKEN");
    await vercelEnvAdd("TELEGRAM_BOT_TOKEN", token);
    console.log("Synced TELEGRAM_BOT_TOKEN to Vercel production.");
  } catch (e) {
    console.warn("Vercel sync failed:", e instanceof Error ? e.message : e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

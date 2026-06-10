/**
 * Compare local .env keys against Master Admin deployment env registry.
 *
 * Usage: node scripts/audit-env-master-sync.cjs
 */
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { config } = require("dotenv");

config({ path: resolve(process.cwd(), ".env.local") });
config();

function loadRegistryNames() {
  const raw = readFileSync(resolve(process.cwd(), "lib/deployment-env-registry.ts"), "utf8");
  const names = new Set();
  for (const m of raw.matchAll(/name:\s*"([A-Z][A-Z0-9_]*)"/g)) {
    names.add(m[1]);
  }
  return names;
}

function loadEnvKeys() {
  const keys = new Set();
  for (const [k, v] of Object.entries(process.env)) {
    if (!k || v == null || String(v).trim() === "") continue;
    keys.add(k);
  }
  for (const file of [".env", ".env.local"]) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (val) keys.add(key);
    }
  }
  return keys;
}

const registry = loadRegistryNames();
const envKeys = loadEnvKeys();

const inRegistryAndEnv = [...registry].filter((k) => envKeys.has(k)).sort();
const inRegistryMissingEnv = [...registry].filter((k) => !envKeys.has(k)).sort();
const envNotInRegistry = [...envKeys]
  .filter((k) => !registry.has(k) && !k.startsWith("npm_") && k !== "PATH")
  .sort();

console.log("\n[env ↔ Master Admin registry audit]\n");
console.log(`Registry vars: ${registry.size}`);
console.log(`Local .env keys with values: ${envKeys.size}`);
console.log(`\n✓ In registry AND local env (${inRegistryAndEnv.length}):`);
for (const k of inRegistryAndEnv) console.log(`  - ${k}`);

console.log(`\n⚠ In registry but missing/empty locally (${inRegistryMissingEnv.length}):`);
for (const k of inRegistryMissingEnv) console.log(`  - ${k}`);

console.log(`\nℹ In local env but NOT in Master registry (${envNotInRegistry.length}):`);
for (const k of envNotInRegistry) console.log(`  - ${k}`);

console.log("\nMaster Admin shows registry vars at /admin/master#deployment-environment.");
console.log("Resolution: Master encrypted overrides > Vercel/process env > unset.");
console.log("Sync registry values to Master + Vercel: npm run deployment:provision-sync\n");

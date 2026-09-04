/**
 * Diagnose MongoDB Atlas DNS / SRV expansion (Windows hotspot 10051 etc.).
 * Usage: node scripts/db-dns-check.cjs
 */
"use strict";

const path = require("path");
const fs = require("fs");
const dns = require("dns");
const net = require("net");
const { ensureNonSrvDatabaseUrl, parseSrvUrl, PUBLIC_DNS } = require("./mongodb-srv-fallback.cjs");

function loadEnvFile(file) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const raw = (process.env.DATABASE_URL || process.env.MONGODB_URI || "").trim();
console.log("=== ODELHUB Mongo DNS check ===");
if (!raw) {
  console.error("No DATABASE_URL / MONGODB_URI in .env or .env.local");
  process.exit(1);
}

const scheme = raw.toLowerCase().startsWith("mongodb+srv://") ? "mongodb+srv" : "mongodb";
const parsed = parseSrvUrl(raw) || { hostname: "(non-srv)" };
console.log("scheme:", scheme);
console.log("hostname:", parsed.hostname || "(n/a)");
console.log("Node dns servers (before):", dns.getServers());

const result = ensureNonSrvDatabaseUrl(raw, { quiet: false, force: process.env.MONGODB_FORCE_NON_SRV === "1" });
console.log("fallback:", result.reason, "converted=", result.converted);
console.log("Node dns servers (after):", dns.getServers());

function redact(url) {
  return url.replace(/\/\/([^@/]+)@/, "//***:***@");
}
console.log("effective URL:", redact(result.url));

const hosts = [];
try {
  const afterAt = result.url.split("@")[1] || "";
  const hostPart = afterAt.split("/")[0].split("?")[0];
  for (const h of hostPart.split(",")) {
    const [host, port] = h.split(":");
    if (host) hosts.push({ host, port: Number(port || 27017) });
  }
} catch (e) {
  console.error("URL parse failed:", e.message);
}

async function tcpOk(host, port, ms = 5000) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port }, () => {
      s.end();
      resolve(true);
    });
    s.setTimeout(ms, () => {
      s.destroy();
      resolve(false);
    });
    s.on("error", () => resolve(false));
  });
}

(async () => {
  if (hosts.length === 0) {
    console.warn("No hosts to probe.");
    process.exit(result.converted || scheme === "mongodb" ? 0 : 2);
  }
  console.log("TCP probe (public DNS preferred for name resolve):");
  let any = false;
  for (const { host, port } of hosts.slice(0, 3)) {
    const ok = await tcpOk(host, port);
    console.log(`  ${host}:${port} → ${ok ? "OK" : "FAIL"}`);
    if (ok) any = true;
  }
  if (!any) {
    console.error(
      "\nNo Atlas shard reachable. Check internet/VPN/firewall, Atlas IP allowlist (0.0.0.0/0 for dev), then restart npm run dev.",
    );
    process.exit(2);
  }
  console.log("\nDNS/TCP look healthy. Restart Next if login still fails: stop server → npm run dev.");
  console.log("Public resolvers used for SRV expand:", (PUBLIC_DNS || []).join(", "));
})();

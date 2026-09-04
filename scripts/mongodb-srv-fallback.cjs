/**
 * When Node's c-ares resolver cannot querySrv / resolve A (Windows ECONNREFUSED /
 * 10013 / 10051 unreachable network / hotspot DNS), expand mongodb+srv:// to a
 * standard mongodb:// host list using OS DNS — preferring public resolvers
 * (8.8.8.8 / 1.1.1.1) so flaky router DNS does not block Atlas.
 *
 * Default: auto on Windows only (Vercel/Linux keep mongodb+srv).
 * Opt out: MONGODB_SRV_FALLBACK=0
 * Force expand: MONGODB_FORCE_NON_SRV=1
 * Force enable on non-Windows: MONGODB_SRV_FALLBACK=1
 * Prefer public DNS only: MONGODB_PUBLIC_DNS=0 to use system resolver alone
 */
"use strict";

const { spawnSync } = require("child_process");
const dns = require("dns");

const g = globalThis;
if (!g.__odelhubMongodbSrvFallbackCache) {
  g.__odelhubMongodbSrvFallbackCache = Object.create(null);
}

const PUBLIC_DNS = ["8.8.8.8", "1.1.1.1"];

function parseSrvUrl(url) {
  const m = String(url).match(/^mongodb\+srv:\/\/([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/i);
  if (!m) return null;
  return {
    credentials: m[1],
    hostname: m[2].replace(/\.$/, ""),
    dbPath: m[3] || "/",
    search: (m[4] || "?").slice(1),
  };
}

/** Point Node's DNS at public resolvers (helps Prisma A-record lookups after non-SRV expand). */
function preferPublicDnsForNode() {
  if (process.env.MONGODB_PUBLIC_DNS === "0") return false;
  if (process.env.VITEST) return false;
  try {
    dns.setServers(PUBLIC_DNS);
    if (typeof dns.setDefaultResultOrder === "function") {
      dns.setDefaultResultOrder("ipv4first");
    }
    return true;
  } catch {
    return false;
  }
}

/** Probe Node dns.resolveSrv in a short-lived child (avoids hanging the parent). */
function nodeQuerySrvOk(hostname, timeoutMs = 2000) {
  const cache = g.__odelhubMongodbSrvFallbackCache;
  const key = `probe:${hostname}`;
  if (key in cache) return cache[key];

  const script = `
    const dns = require("dns");
    try { dns.setServers(${JSON.stringify(PUBLIC_DNS)}); } catch (_) {}
    const host = ${JSON.stringify(hostname)};
    const t = setTimeout(() => process.exit(2), ${timeoutMs});
    dns.resolveSrv("_mongodb._tcp." + host, (err, addrs) => {
      clearTimeout(t);
      process.exit(!err && Array.isArray(addrs) && addrs.length > 0 ? 0 : 1);
    });
  `;
  const r = spawnSync(process.execPath, ["-e", script], {
    encoding: "utf8",
    windowsHide: true,
    timeout: timeoutMs + 1500,
    killSignal: "SIGKILL",
  });
  const ok = r.status === 0;
  cache[key] = ok;
  return ok;
}

function runDnsLookup(type, name) {
  const attempts = [];
  const usePublic = process.env.MONGODB_PUBLIC_DNS !== "0";

  if (process.platform === "win32") {
    if (usePublic) {
      for (const server of PUBLIC_DNS) {
        attempts.push({ cmd: "nslookup", args: [`-type=${type}`, name, server] });
      }
    }
    attempts.push({ cmd: "nslookup", args: [`-type=${type}`, name] });
  } else {
    if (usePublic) {
      for (const server of PUBLIC_DNS) {
        attempts.push({ cmd: "dig", args: [`@${server}`, "+short", "+time=2", "+tries=1", type, name] });
      }
    }
    attempts.push({ cmd: "dig", args: ["+short", type, name] });
    attempts.push({ cmd: "nslookup", args: [`-type=${type}`, name] });
  }

  for (const a of attempts) {
    const r = spawnSync(a.cmd, a.args, {
      encoding: "utf8",
      windowsHide: true,
      timeout: 8000,
      shell: process.platform === "win32",
      killSignal: "SIGKILL",
    });
    const text = `${r.stdout || ""}\n${r.stderr || ""}`;
    if (r.error && r.error.code === "ENOENT") continue;
    // Prefer answers that actually contain SRV/TXT payload (skip empty / timeout-only)
    if (type === "SRV" && !/SRV service location:|^\S+\s+\d+\s+\d+\s+\d+\s+\S+/im.test(text) && !/port\s*=/i.test(text)) {
      continue;
    }
    if (text.trim()) return { tool: a.cmd, text };
  }
  return null;
}

function parseSrvRecords(text, tool) {
  const hosts = [];
  if (tool === "dig") {
    for (const line of text.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4 && /^\d+$/.test(parts[2])) {
        const port = parts[2];
        const host = parts[3].replace(/\.$/, "");
        if (host) hosts.push(`${host}:${port}`);
      } else if (parts.length === 1 && /^\S+$/.test(parts[0]) && parts[0].includes(".")) {
        // dig +short sometimes returns host only for weird configs — skip
      }
    }
    return hosts;
  }

  const blocks = text.split(/SRV service location:/i);
  for (const block of blocks.slice(1)) {
    const portM = block.match(/port\s*=\s*(\d+)/i);
    const hostM = block.match(/svr hostname\s*=\s*(\S+)/i);
    if (hostM) {
      hosts.push(`${hostM[1].replace(/\.$/, "")}:${portM ? portM[1] : "27017"}`);
    }
  }
  return hosts;
}

function parseTxtOptions(text) {
  const quoted =
    text.match(/"([^"]*replicaSet=[^"]*)"/i) || text.match(/"([^"]*authSource=[^"]*)"/i);
  if (quoted) {
    const params = new URLSearchParams(quoted[1]);
    return {
      replicaSet: params.get("replicaSet") || undefined,
      authSource: params.get("authSource") || undefined,
    };
  }
  const digLine = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^"|"$/g, ""))
    .find((l) => /replicaSet=|authSource=/.test(l));
  if (digLine) {
    const params = new URLSearchParams(digLine);
    return {
      replicaSet: params.get("replicaSet") || undefined,
      authSource: params.get("authSource") || undefined,
    };
  }
  return {};
}

function expandMongodbSrvUrl(url) {
  const parsed = parseSrvUrl(url);
  if (!parsed) return null;

  const cache = g.__odelhubMongodbSrvFallbackCache;
  const cacheKey = `expand:${parsed.hostname}`;
  if (cache[cacheKey]) {
    const { hosts, txtOpts } = cache[cacheKey];
    return buildNonSrvUrl(parsed, hosts, txtOpts);
  }

  const srv = runDnsLookup("SRV", `_mongodb._tcp.${parsed.hostname}`);
  if (!srv) return null;
  const hosts = parseSrvRecords(srv.text, srv.tool);
  if (hosts.length === 0) return null;

  const txt = runDnsLookup("TXT", parsed.hostname);
  const txtOpts = txt ? parseTxtOptions(txt.text) : {};
  cache[cacheKey] = { hosts, txtOpts };
  return buildNonSrvUrl(parsed, hosts, txtOpts);
}

function buildNonSrvUrl(parsed, hosts, txtOpts) {
  const qs = new URLSearchParams(parsed.search);
  qs.set("ssl", "true");
  if (txtOpts.authSource && !qs.get("authSource")) qs.set("authSource", txtOpts.authSource);
  if (txtOpts.replicaSet && !qs.get("replicaSet")) qs.set("replicaSet", txtOpts.replicaSet);
  if (!qs.get("authSource")) qs.set("authSource", "admin");
  return `mongodb://${parsed.credentials}@${hosts.join(",")}${parsed.dbPath}?${qs.toString()}`;
}

function shouldAttemptFallback(force) {
  if (process.env.MONGODB_SRV_FALLBACK === "0") return false;
  if (force || process.env.MONGODB_FORCE_NON_SRV === "1") return true;
  if (process.env.MONGODB_SRV_FALLBACK === "1") return true;
  if (process.env.VITEST) return false;
  return process.platform === "win32";
}

/**
 * @param {string} url
 * @param {{ force?: boolean; quiet?: boolean }} [opts]
 * @returns {{ url: string; converted: boolean; reason?: string }}
 */
function ensureNonSrvDatabaseUrl(url, opts = {}) {
  const trimmed = String(url || "").trim();
  if (!trimmed.toLowerCase().startsWith("mongodb+srv://")) {
    return { url: trimmed, converted: false };
  }

  const force = Boolean(opts.force) || process.env.MONGODB_FORCE_NON_SRV === "1";
  if (!shouldAttemptFallback(force)) {
    return {
      url: trimmed,
      converted: false,
      reason: process.env.MONGODB_SRV_FALLBACK === "0" ? "disabled" : "skipped",
    };
  }

  const parsed = parseSrvUrl(trimmed);
  if (!parsed) return { url: trimmed, converted: false, reason: "unparsed" };

  const isAtlas = /\.mongodb\.net$/i.test(parsed.hostname);
  if (!force && !isAtlas) {
    return { url: trimmed, converted: false, reason: "non-atlas" };
  }

  /**
   * Windows + Atlas: always expand when public/system DNS can resolve SRV.
   * Leaving mongodb+srv uses Node c-ares, which often fails with os error 10051
   * on hotspot/router DNS even when nslookup @8.8.8.8 works.
   */
  const preferNonSrv =
    force ||
    process.platform === "win32" ||
    process.env.MONGODB_PREFER_NON_SRV === "1" ||
    !nodeQuerySrvOk(parsed.hostname);

  if (!preferNonSrv) {
    return { url: trimmed, converted: false, reason: "node-ok" };
  }

  const expanded = expandMongodbSrvUrl(trimmed);
  if (!expanded) {
    if (!opts.quiet) {
      console.warn(
        "[mongodb-srv-fallback] Could not expand SRV via public/system DNS; leaving mongodb+srv URL. " +
          "Check internet / try MONGODB_FORCE_NON_SRV=1 after fixing DNS.",
      );
    }
    return { url: trimmed, converted: false, reason: "expand-failed" };
  }

  preferPublicDnsForNode();

  if (!opts.quiet) {
    console.warn(
      "[mongodb-srv-fallback] Using non-SRV Atlas host list (public DNS preferred) to avoid Windows querySrv/10051 failures.",
    );
  }
  return {
    url: expanded,
    converted: true,
    reason: force ? "forced" : process.platform === "win32" ? "win32-prefer-non-srv" : "node-failed",
  };
}

module.exports = {
  ensureNonSrvDatabaseUrl,
  expandMongodbSrvUrl,
  nodeQuerySrvOk,
  parseSrvUrl,
  preferPublicDnsForNode,
  PUBLIC_DNS,
};

/**
 * When Node's c-ares resolver cannot querySrv (Windows ECONNREFUSED / 10013 / timeout),
 * expand mongodb+srv:// to a standard mongodb:// host list using the OS DNS tool
 * (nslookup / dig) — the same path that works in a normal terminal.
 *
 * Default: auto on Windows only (Vercel/Linux keep mongodb+srv).
 * Opt out: MONGODB_SRV_FALLBACK=0
 * Force expand: MONGODB_FORCE_NON_SRV=1
 * Force enable on non-Windows: MONGODB_SRV_FALLBACK=1
 */
"use strict";

const { spawnSync } = require("child_process");

const g = globalThis;
if (!g.__odelhubMongodbSrvFallbackCache) {
  g.__odelhubMongodbSrvFallbackCache = Object.create(null);
}

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

/** Probe Node dns.resolveSrv in a short-lived child (avoids hanging the parent). */
function nodeQuerySrvOk(hostname, timeoutMs = 2000) {
  const cache = g.__odelhubMongodbSrvFallbackCache;
  const key = `probe:${hostname}`;
  if (key in cache) return cache[key];

  const script = `
    const dns = require("dns");
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
  if (process.platform === "win32") {
    attempts.push({ cmd: "nslookup", args: [`-type=${type}`, name] });
  } else {
    attempts.push({ cmd: "dig", args: ["+short", type, name] });
    attempts.push({ cmd: "nslookup", args: [`-type=${type}`, name] });
  }

  for (const a of attempts) {
    const r = spawnSync(a.cmd, a.args, {
      encoding: "utf8",
      windowsHide: true,
      timeout: 12000,
      shell: process.platform === "win32",
      killSignal: "SIGKILL",
    });
    const text = `${r.stdout || ""}\n${r.stderr || ""}`;
    if (r.error && r.error.code === "ENOENT") continue;
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
    // Re-apply credentials/db/query from this URL onto cached host list + txt opts
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
  // Vitest: never touch live DNS from pool-tuning helpers
  if (process.env.VITEST) return false;
  // Auto only on Windows where Node querySrv commonly breaks
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

  // Only expand real Atlas (or forced) — avoid nslookup on fake test hosts
  const isAtlas = /\.mongodb\.net$/i.test(parsed.hostname);
  if (!force && !isAtlas) {
    return { url: trimmed, converted: false, reason: "non-atlas" };
  }

  if (!force && nodeQuerySrvOk(parsed.hostname)) {
    return { url: trimmed, converted: false, reason: "node-ok" };
  }

  const expanded = expandMongodbSrvUrl(trimmed);
  if (!expanded) {
    if (!opts.quiet) {
      console.warn(
        "[mongodb-srv-fallback] Node querySrv failed and system DNS could not expand SRV; leaving mongodb+srv URL.",
      );
    }
    return { url: trimmed, converted: false, reason: "expand-failed" };
  }

  if (!opts.quiet) {
    console.warn(
      "[mongodb-srv-fallback] Node querySrv unavailable; using host list from system DNS (nslookup/dig).",
    );
  }
  return { url: expanded, converted: true, reason: force ? "forced" : "node-failed" };
}

module.exports = {
  ensureNonSrvDatabaseUrl,
  expandMongodbSrvUrl,
  nodeQuerySrvOk,
  parseSrvUrl,
};

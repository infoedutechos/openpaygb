/**
 * Pulls game/public API routes from ura-pearl-data-center: everything under `app/api/**`
 * EXCEPT first-segment folders owned by ODELHUB Pay (tuition, auth, webhooks, cron, etc.).
 *
 * Usage: node scripts/pull-ura-app-api-game.mjs
 * Optional: GITHUB_TOKEN — API rate limit.
 *
 * Skipped (never overwritten): Pay/tuition segments including public checkout, student portal,
 * master console, plus admin, auth, collect, cron, fx, health, manifest, payments, programmes,
 * receipts, students, webhooks — use `sync:ura-api-admin` for `app/api/admin/**` except summary.
 */
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const OWNER = "urapearlug-sys";
const REPO = "ura-pearl-data-center";
const REF = "main";
const PREFIX = "app/api";

/** Do not pull these top-level segments under app/api/ */
const SKIP_FIRST = new Set([
  "admin",
  "auth",
  "collect",
  "cron",
  "fx",
  "health",
  "manifest",
  "master",
  "payments",
  "programmes",
  "public",
  "receipts",
  "student",
  "students",
  "webhooks",
]);

const ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const TARGET = path.join(ROOT, PREFIX);

function firstSegment(ghPath) {
  const m = ghPath.match(/^app\/api\/([^/]+)/);
  return m ? m[1] : null;
}

function shouldSkip(ghPath) {
  if (!ghPath.startsWith(PREFIX + "/")) return true;
  const seg = firstSegment(ghPath);
  if (!seg) return true;
  return SKIP_FIRST.has(seg);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getOnce(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    /** @type {import('node:https').RequestOptions} */
    const o = { hostname: opts.hostname, path: opts.pathname + opts.search, headers: {} };
    if (process.env.GITHUB_TOKEN) {
      o.headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    o.headers["User-Agent"] = "odelhub-pay-sync";
    https
      .get(o, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (!loc) return reject(new Error("Redirect without location"));
          return resolve(getOnce(loc));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 400) {
            return reject(Object.assign(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`), { statusCode: res.statusCode }));
          }
          resolve(JSON.parse(body));
        });
      })
      .on("error", reject);
  });
}

/** Retries on GitHub unauthenticated rate limit (403) or secondary limit (429). */
async function get(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await getOnce(url);
    } catch (e) {
      const code = /** @type {{ statusCode?: number }} */ (e).statusCode;
      if ((code === 403 || code === 429) && attempt < 3) {
        const wait = 65_000 * (attempt + 1);
        console.error(`GitHub rate limit (${code}), waiting ${wait / 1000}s… Set GITHUB_TOKEN to avoid.`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
  throw new Error("get: unreachable");
}

async function walk(apiPath, diskBase) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURI(apiPath)}?ref=${REF}`;
  const entries = await get(url);
  if (!Array.isArray(entries)) {
    throw new Error(`Expected array for ${apiPath}`);
  }
  for (const ent of entries) {
    const ghPath = ent.path;
    if (ent.type === "dir") {
      if (shouldSkip(ghPath + "/x")) {
        const seg = firstSegment(ghPath + "/x");
        if (seg && SKIP_FIRST.has(seg)) {
          console.error("skip tree", ghPath);
          continue;
        }
      }
      await walk(ghPath, path.join(diskBase, ent.name));
      continue;
    }
    if (ent.type !== "file" || !ent.download_url) continue;
    if (shouldSkip(ghPath)) {
      console.error("skip", ghPath);
      continue;
    }
    const rel = ghPath.slice(PREFIX.length + 1);
    const dest = path.join(TARGET, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const rawPath = ghPath
      .split("/")
      .map((s) => encodeURIComponent(s))
      .join("/");
    const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${REF}/${rawPath}`;
    const buf = await new Promise((resolve, reject) => {
      https.get(rawUrl, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Download ${res.statusCode} ${ghPath}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }).on("error", reject);
    });
    fs.writeFileSync(dest, buf);
    console.error("wrote", path.relative(ROOT, dest));
  }
}

await walk(PREFIX, TARGET);
console.error(
  "Done. Game APIs merged under app/api/. Run prisma generate if schema already matches; then npm run verify."
);

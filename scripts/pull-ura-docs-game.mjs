/**
 * Pulls upstream `docs/**` from ura-pearl-data-center into docs/upstream-ura-game/
 * (game design / NFT / teams docs — does not replace ODELHUB Pay docs in docs/*.md).
 *
 * Usage: node scripts/pull-ura-docs-game.mjs
 * Optional: GITHUB_TOKEN
 */
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const OWNER = "urapearlug-sys";
const REPO = "ura-pearl-data-center";
const REF = "main";
const PREFIX = "docs";

const ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const OUT_ROOT = path.join(ROOT, "docs", "upstream-ura-game");

function get(url) {
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
          return resolve(get(loc));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
          }
          resolve(JSON.parse(body));
        });
      })
      .on("error", reject);
  });
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
      await walk(ghPath, path.join(diskBase, ent.name));
      continue;
    }
    if (ent.type !== "file" || !ent.download_url) continue;
    if (!ghPath.startsWith(PREFIX + "/")) continue;
    const rel = ghPath.slice(PREFIX.length + 1);
    const dest = path.join(diskBase, rel);
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

fs.mkdirSync(OUT_ROOT, { recursive: true });
const readme = `# Upstream game docs (mirror)

Markdown from [urapearlug-sys/ura-pearl-data-center](https://github.com/urapearlug-sys/ura-pearl-data-center) \`docs/\` on \`main\`.

Regenerate:

\`\`\`bash
npm run sync:ura-game-docs
\`\`\`
`;
fs.writeFileSync(path.join(OUT_ROOT, "README.md"), readme, "utf8");
console.error("wrote", path.relative(ROOT, path.join(OUT_ROOT, "README.md")));

await walk(PREFIX, OUT_ROOT);
console.error("Done.");

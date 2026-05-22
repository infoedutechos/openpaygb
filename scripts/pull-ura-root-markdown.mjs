/**
 * Mirrors upstream repo-root runbooks from ura-pearl-data-center into docs/upstream-ura-pearl/
 * (same filenames as on GitHub root — Vercel / webhook / deploy notes).
 *
 * Usage: node scripts/pull-ura-root-markdown.mjs
 * Optional: GITHUB_TOKEN — API rate limit.
 */
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const OWNER = "urapearlug-sys";
const REPO = "ura-pearl-data-center";
const REF = "main";

const ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const OUT_DIR = path.join(ROOT, "docs", "upstream-ura-pearl");

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

const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents?ref=${REF}`;
const entries = await get(url);
if (!Array.isArray(entries)) {
  throw new Error("Expected root contents array");
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const readme = `# Upstream runbooks (mirror)

Files in this folder are copied from the **root** of [urapearlug-sys/ura-pearl-data-center](https://github.com/urapearlug-sys/ura-pearl-data-center) (\`main\`) by:

\`\`\`bash
npm run sync:ura-docs
\`\`\`

ODELHUB Pay keeps **product** documentation in \`docs/*.md\` (README, flows, OpenAPI). These mirrors are **operational** notes from the upstream game repo (Vercel, webhooks, builds).

**Do not** treat licensing in upstream game files as applying to ODELHUB Pay tuition code — review upstream headers where present.
`;
fs.writeFileSync(path.join(OUT_DIR, "README.md"), readme, "utf8");
console.error("wrote", path.relative(ROOT, path.join(OUT_DIR, "README.md")));

for (const ent of entries) {
  if (ent.type !== "file" || !ent.download_url) continue;
  const name = ent.name;
  if (!name.endsWith(".md") && name !== "DEPLOYMENT_VERSION.txt") continue;
  const dest = path.join(OUT_DIR, name);
  const buf = await new Promise((resolve, reject) => {
    https.get(ent.download_url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Download ${res.statusCode} ${name}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
  fs.writeFileSync(dest, buf);
  console.error("wrote", path.relative(ROOT, dest));
}

console.error("Done.");

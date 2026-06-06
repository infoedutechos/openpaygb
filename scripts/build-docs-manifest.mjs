/**
 * Regenerates the MANIFEST array in docs/index.html from all docs under docs/.
 * Run: npm run docs:build-index
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, "..", "docs");
const indexPath = path.join(docsRoot, "index.html");

const DOC_EXTENSIONS = new Set([".md", ".yaml", ".yml", ".csv", ".txt"]);
const SKIP_NAMES = new Set(["index.html"]);

function slugify(relPath) {
  return relPath
    .replace(/\\/g, "/")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferCategory(relPath) {
  const norm = relPath.replace(/\\/g, "/").toLowerCase();
  if (norm.includes("upstream-ura-pearl/")) return "upstream-pearl";
  if (norm.includes("upstream-ura-game/")) return "upstream-game";
  if (norm.includes("contract-build/")) return "contracts";
  if (norm.endsWith("openapi.yaml") || norm.endsWith("openapi.yml")) return "api-reference";
  if (norm.endsWith(".csv") || norm.includes("api_inventory")) return "api-reference";
  if (norm.includes("flow") || norm.includes("user_flow") || norm.includes("admin_flow")) {
    return "flows";
  }
  if (norm.includes("economics")) return "economics";
  if (
    norm.includes("security") ||
    norm.includes("error_hardening") ||
    norm.includes("integration_hardening") ||
    norm.includes("backup")
  ) {
    return "operations";
  }
  if (norm.includes("audit") || norm.includes("backlog") || norm.includes("user_stories")) {
    return "product";
  }
  if (norm.includes("deploy") || norm.includes("vercel") || norm.includes("production")) {
    return "deployment";
  }
  if (norm.includes("structure") || norm.includes("folder")) return "implementation";
  return "implementation";
}

function titleFromFile(relPath, content) {
  const heading = content.match(/^#\s+(.+)$/m);
  if (heading?.[1]) return heading[1].trim().replace(/\s+#+\s*$/, "");
  const base = path.basename(relPath, path.extname(relPath));
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function keywordsFrom(relPath, title, category) {
  const base = relPath
    .replace(/\\/g, "/")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .split(/[/\-_]+/)
    .filter(Boolean)
    .join(" ");
  return `${title} ${category} ${base}`.toLowerCase().replace(/\s+/g, " ").trim();
}

function walk(dir, base = "") {
  const entries = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (SKIP_NAMES.has(name)) continue;
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      entries.push(...walk(full, rel));
      continue;
    }
    const ext = path.extname(name).toLowerCase();
    if (!DOC_EXTENSIONS.has(ext)) continue;
    const content = ext === ".md" || ext === ".txt" ? fs.readFileSync(full, "utf8") : "";
    entries.push({
      id: slugify(rel),
      file: rel.replace(/\\/g, "/"),
      title: titleFromFile(rel, content),
      category: inferCategory(rel),
      keywords: keywordsFrom(rel, titleFromFile(rel, content), inferCategory(rel)),
    });
  }
  return entries;
}

function priority(a) {
  const order = {
    flows: 0,
    architecture: 1,
    implementation: 2,
    deployment: 3,
    operations: 4,
    economics: 5,
    product: 6,
    "api-reference": 7,
    "upstream-pearl": 8,
    "upstream-game": 9,
    contracts: 10,
  };
  const cat = order[a.category] ?? 50;
  const root = a.file.includes("/") ? 1 : 0;
  return [root, cat, a.title.toLowerCase()];
}

const manifest = walk(docsRoot).sort((a, b) => {
  const pa = priority(a);
  const pb = priority(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
});

const manifestJson = JSON.stringify(manifest, null, 2);

let html = fs.readFileSync(indexPath, "utf8");
const start = html.indexOf("const MANIFEST = [");
if (start < 0) {
  console.error("[docs:build-index] Could not find MANIFEST block in index.html");
  process.exit(1);
}

const categoryStart = html.indexOf("const CATEGORY_LABEL = {", start);
if (categoryStart < 0) {
  console.error("[docs:build-index] Could not find CATEGORY_LABEL block in index.html");
  process.exit(1);
}
const end = html.lastIndexOf("]", categoryStart);
if (end < start) {
  console.error("[docs:build-index] Could not find MANIFEST end in index.html");
  process.exit(1);
}
html = html.slice(0, start) + `const MANIFEST = ${manifestJson};` + html.slice(end + 1);

const categoryLabels = {
  all: "All",
  flows: "Flows",
  architecture: "Architecture",
  implementation: "Implementation",
  deployment: "Deployment",
  operations: "Operations",
  economics: "Economics",
  product: "Product",
  "api-reference": "API reference",
  "upstream-pearl": "Upstream (Pearl)",
  "upstream-game": "Upstream (Game)",
  contracts: "Contracts",
};

const labelStart = html.indexOf("const CATEGORY_LABEL = {", start);
const labelEnd = html.indexOf("};", labelStart);
if (labelStart >= 0 && labelEnd >= 0) {
  const labelJson = JSON.stringify(categoryLabels, null, 2);
  html = html.slice(0, labelStart) + `const CATEGORY_LABEL = ${labelJson};` + html.slice(labelEnd + 2);
}

fs.writeFileSync(indexPath, html, "utf8");
console.log(`[docs:build-index] Updated ${manifest.length} documents in docs/index.html`);

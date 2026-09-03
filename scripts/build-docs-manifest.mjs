/**
 * Regenerates the MANIFEST array in docs/index.html from all docs under docs/.
 * Skips root stub redirects ("# Moved"). Run: npm run docs:build-index
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
  const top = norm.split("/")[0];
  const folderCats = {
    flows: "flows",
    economics: "economics",
    architecture: "architecture",
    platform: "platform",
    school: "school",
    deployment: "deployment",
    operations: "operations",
    product: "product",
    "api-reference": "api-reference",
    guides: "guides",
    "upstream-ura-pearl": "upstream-pearl",
    "upstream-ura-game": "upstream-game",
    "contract-build": "contracts",
  };
  if (folderCats[top]) return folderCats[top];

  if (norm.includes("upstream-ura-pearl/")) return "upstream-pearl";
  if (norm.includes("upstream-ura-game/")) return "upstream-game";
  if (norm.includes("contract-build/")) return "contracts";
  if (norm.endsWith("openapi.yaml") || norm.endsWith("openapi.yml")) return "api-reference";
  if (norm.endsWith(".csv") || norm.includes("api_inventory")) return "api-reference";
  if (norm.includes("flow")) return "flows";
  if (norm.includes("economics")) return "economics";
  if (norm.includes("security") || norm.includes("hardening") || norm.includes("backup")) {
    return "operations";
  }
  if (norm.includes("deploy") || norm.includes("vercel") || norm.includes("production")) {
    return "deployment";
  }
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

function isStub(content, relPath) {
  if (!relPath.includes("/") && (content.startsWith("# Moved\n") || content.startsWith("Moved to "))) {
    return true;
  }
  return false;
}

function walk(dir, base = "") {
  const entries = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (SKIP_NAMES.has(name)) continue;
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      entries.push(...walk(full, rel));
      continue;
    }
    const ext = path.extname(name).toLowerCase();
    if (!DOC_EXTENSIONS.has(ext)) continue;
    const content =
      ext === ".md" || ext === ".txt" || ext === ".csv" || ext === ".yaml" || ext === ".yml"
        ? fs.readFileSync(full, "utf8")
        : "";
    if (isStub(content, rel.replace(/\\/g, "/"))) continue;
    const title = titleFromFile(rel, content);
    const category = inferCategory(rel);
    entries.push({
      id: slugify(rel),
      file: rel.replace(/\\/g, "/"),
      title,
      category,
      keywords: keywordsFrom(rel, title, category),
      bytes: stat.size,
    });
  }
  return entries;
}

function priority(a) {
  const order = {
    platform: 0,
    guides: 1,
    flows: 2,
    school: 3,
    architecture: 4,
    deployment: 5,
    operations: 6,
    economics: 7,
    product: 8,
    "api-reference": 9,
    implementation: 10,
    "upstream-pearl": 11,
    "upstream-game": 12,
    contracts: 13,
  };
  const cat = order[a.category] ?? 50;
  return [cat, a.title.toLowerCase()];
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

const totalBytes = manifest.reduce((s, d) => s + (d.bytes || 0), 0);
const libraryStats = {
  totalDocuments: manifest.length,
  totalBytes,
  totalKb: Math.round((totalBytes / 1024) * 10) / 10,
  generatedAt: new Date().toISOString(),
};

const manifestForClient = manifest.map(({ bytes, ...rest }) => rest);
const manifestJson = JSON.stringify(manifestForClient, null, 2);
const statsJson = JSON.stringify(libraryStats, null, 2);

let html = fs.readFileSync(indexPath, "utf8");

function replaceConst(htmlSrc, constName, json) {
  const start = htmlSrc.indexOf(`const ${constName} =`);
  if (start < 0) return null;
  const after = htmlSrc.slice(start);
  const eq = after.indexOf("=");
  let i = eq + 1;
  while (i < after.length && /\s/.test(after[i])) i++;
  const open = after[i];
  let endRel = -1;
  if (open === "[") {
    let depth = 0;
    for (let j = i; j < after.length; j++) {
      if (after[j] === "[") depth++;
      if (after[j] === "]") {
        depth--;
        if (depth === 0) {
          endRel = j;
          break;
        }
      }
    }
  } else if (open === "{") {
    let depth = 0;
    for (let j = i; j < after.length; j++) {
      if (after[j] === "{") depth++;
      if (after[j] === "}") {
        depth--;
        if (depth === 0) {
          endRel = j;
          break;
        }
      }
    }
  }
  if (endRel < 0) return null;
  const absEnd = start + endRel;
  // include trailing semicolon if present
  let end = absEnd + 1;
  if (htmlSrc[end] === ";") end++;
  return (
    htmlSrc.slice(0, start) + `const ${constName} = ${json};` + htmlSrc.slice(end)
  );
}

const withManifest = replaceConst(html, "MANIFEST", manifestJson);
if (!withManifest) {
  console.error("[docs:build-index] Could not replace MANIFEST");
  process.exit(1);
}
html = withManifest;

const categoryLabels = {
  all: "All",
  platform: "Platform / OPGB",
  guides: "User guides",
  flows: "Flows",
  school: "Schools / tuition",
  architecture: "Architecture",
  deployment: "Deployment",
  operations: "Operations",
  economics: "Economics",
  product: "Product",
  "api-reference": "API reference",
  implementation: "Implementation",
  "upstream-pearl": "Upstream (Pearl)",
  "upstream-game": "Upstream (Game)",
  contracts: "Contracts",
};

let withLabels = replaceConst(html, "CATEGORY_LABEL", JSON.stringify(categoryLabels, null, 2));
if (!withLabels) {
  console.error("[docs:build-index] Could not replace CATEGORY_LABEL");
  process.exit(1);
}
html = withLabels;

if (html.includes("const LIBRARY_STATS =")) {
  const withStats = replaceConst(html, "LIBRARY_STATS", statsJson);
  if (withStats) html = withStats;
} else {
  html = html.replace(
    "const MANIFEST =",
    `const LIBRARY_STATS = ${statsJson};\n      const MANIFEST =`,
  );
}

fs.writeFileSync(indexPath, html, "utf8");
console.log(
  `[docs:build-index] Updated ${manifest.length} documents (${libraryStats.totalKb} KB) in docs/index.html`,
);

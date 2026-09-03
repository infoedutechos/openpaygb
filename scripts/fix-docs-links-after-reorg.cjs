/**
 * Rewrite relative markdown links after docs reorganization.
 * Maps old root filenames to new folder paths.
 * Usage: node scripts/fix-docs-links-after-reorg.cjs
 */
const fs = require("fs");
const path = require("path");

const docsRoot = path.resolve(__dirname, "..", "docs");

const FOLDERS = new Set([
  "flows",
  "economics",
  "architecture",
  "platform",
  "school",
  "deployment",
  "operations",
  "product",
  "api-reference",
  "guides",
  "upstream-ura-pearl",
  "upstream-ura-game",
  "contract-build",
]);

/** @type {Map<string, string>} basename -> folder/basename */
const loc = new Map();

function walk(dir, base = "") {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name.startsWith(".")) continue;
      walk(full, rel);
      continue;
    }
    if (!/\.(md|txt|yaml|yml|csv)$/i.test(name)) continue;
    // Prefer real files in category folders over stubs at root
    if (base && FOLDERS.has(base.split("/")[0])) {
      loc.set(name, rel.replace(/\\/g, "/"));
    } else if (!loc.has(name) && !base) {
      // root stub or kept file
      loc.set(name, name);
    }
  }
}

walk(docsRoot);

// Prefer category paths: re-scan and overwrite with folder paths
for (const folder of FOLDERS) {
  const d = path.join(docsRoot, folder);
  if (!fs.existsSync(d)) continue;
  for (const name of fs.readdirSync(d)) {
    const full = path.join(d, name);
    if (!fs.statSync(full).isFile()) continue;
    if (!/\.(md|txt|yaml|yml|csv)$/i.test(name)) continue;
    // Skip stub-sized? No — only files in folders are canonical
    const content = fs.readFileSync(full, "utf8");
    if (content.startsWith("# Moved\n") || content.startsWith("Moved to ")) continue;
    loc.set(name, `${folder}/${name}`);
  }
}

function rewriteContent(content, fromRel) {
  const fromDir = path.posix.dirname(fromRel.replace(/\\/g, "/"));
  let out = content;
  let changes = 0;

  // Markdown links: ](./FILE) ](FILE) ](../FILE) ](docs/FILE)
  out = out.replace(
    /\]\((?:\.\.?\/)*(?:docs\/)?([A-Za-z0-9_.\-]+\.(?:md|txt|yaml|yml|csv))(#[^)]*)?\)/g,
    (m, file, hash = "") => {
      const target = loc.get(file);
      if (!target) return m;
      // Compute relative from fromDir to target
      let rel;
      if (fromDir === "." || fromDir === "") {
        rel = target;
      } else {
        rel = path.posix.relative(fromDir, target);
        if (!rel.startsWith(".")) rel = `./${rel}`;
      }
      changes++;
      return `](${rel}${hash || ""})`;
    },
  );

  // Backtick paths docs/FOO.md
  out = out.replace(/`docs\/([A-Za-z0-9_.\-]+\.(?:md|txt|yaml|yml|csv))`/g, (m, file) => {
    const target = loc.get(file);
    if (!target || target === file) return m;
    changes++;
    return `\`docs/${target}\``;
  });

  return { out, changes };
}

function walkRewrite(dir, base = "") {
  let total = 0;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name.startsWith(".")) continue;
      total += walkRewrite(full, rel);
      continue;
    }
    if (!/\.md$/i.test(name)) continue;
    const content = fs.readFileSync(full, "utf8");
    if (content.startsWith("# Moved\n")) continue;
    const { out, changes } = rewriteContent(content, rel.replace(/\\/g, "/"));
    if (changes > 0) {
      fs.writeFileSync(full, out, "utf8");
      console.log(`fixed ${rel} (${changes} links)`);
      total += changes;
    }
  }
  return total;
}

const n = walkRewrite(docsRoot);
console.log(`[fix-docs-links] ${n} link replacements`);

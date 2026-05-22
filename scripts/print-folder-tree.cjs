/* eslint-disable no-console */
/**
 * Prints a markdown-friendly tree for docs. Run: node scripts/print-folder-tree.cjs
 * Flags: --prune-game  → one-line stubs for `components/` (except expanded `components/pay/`), `utils/`, `images/`.
 * Env: ODOC_TREE_PRUNE_DIRS=comma,list  → same for arbitrary top-level folder names.
 * Excludes: node_modules, .next, .git, .husky/_ (keep .husky/pre-commit)
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const EXCLUDE_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  ".turbo",
  "dist",
  "coverage",
]);

const PRUNE_ONLY_TOP = new Set(
  (process.env.ODOC_TREE_PRUNE_DIRS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
if (process.argv.includes("--prune-game")) {
  PRUNE_ONLY_TOP.add("components");
  PRUNE_ONLY_TOP.add("utils");
  PRUNE_ONLY_TOP.add("images");
}

function shouldSkipDir(name, parentDir) {
  if (EXCLUDE_DIR_NAMES.has(name)) return true;
  if (name === "_" && path.basename(parentDir) === ".husky") return true;
  return false;
}

function walk(dir, prefix, isLast, lines) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const filtered = entries.filter((e) => {
    if (e.isDirectory() && shouldSkipDir(e.name, dir)) return false;
    if (!e.isDirectory() && /^\.env$/i.test(e.name)) return false;
    if (!e.isDirectory() && /^\.env\.local$/i.test(e.name)) return false;
    // Match .gitignore-style noise (local / build)
    if (!e.isDirectory() && e.name.endsWith(".tsbuildinfo")) return false;
    if (!e.isDirectory() && /^npm-install-log/i.test(e.name)) return false;
    if (!e.isDirectory() && e.name === "tree-out.txt") return false;
    return true;
  });

  filtered.forEach((ent, i) => {
    const last = i === filtered.length - 1;
    const branch = last ? "└── " : "├── ";
    const nextPrefix = prefix + (last ? "    " : "│   ");
    const fullPath = path.join(dir, ent.name);
    const isPrunedRoot =
      ent.isDirectory() && dir === root && PRUNE_ONLY_TOP.has(ent.name);
    if (isPrunedRoot && ent.name === "components") {
      lines.push(`${prefix}${branch}${ent.name}/`);
      const indent = prefix + (last ? "    " : "│   ");
      const payPath = path.join(fullPath, "pay");
      let hasPay = false;
      try {
        hasPay = fs.statSync(payPath).isDirectory();
      } catch {
        hasPay = false;
      }
      if (hasPay) {
        lines.push(`${indent}├── pay/`);
        walk(payPath, `${indent}│   `, true, lines);
      }
      lines.push(
        `${indent}└── …  (other \`components/*\` — run \`npm run docs:tree\` for full tree)`,
      );
      return;
    }
    if (isPrunedRoot) {
      lines.push(
        `${prefix}${branch}${ent.name}/  (… run \`npm run docs:tree\` for full contents)`,
      );
      return;
    }
    lines.push(`${prefix}${branch}${ent.name}${ent.isDirectory() ? "/" : ""}`);
    if (ent.isDirectory()) {
      walk(fullPath, nextPrefix, last, lines);
    }
  });
}

const lines = [];
lines.push("```");
lines.push("ODELHUB Pay/");
walk(root, "", true, lines);
lines.push("```");

const out = lines.join("\n");
const outArgIdx = process.argv.indexOf("--out");
if (outArgIdx !== -1 && process.argv[outArgIdx + 1]) {
  const dest = path.isAbsolute(process.argv[outArgIdx + 1])
    ? process.argv[outArgIdx + 1]
    : path.join(root, process.argv[outArgIdx + 1]);
  fs.writeFileSync(dest, out, "utf8");
  console.error("Wrote", dest);
} else {
  console.log(out);
}

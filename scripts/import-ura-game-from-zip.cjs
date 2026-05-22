/**
 * Offline: copy upstream game `app/api/**` from a local ura-pearl-data-center zip into this repo.
 * Same skip rules as pull-ura-app-api-game.mjs (never overwrites Pay segments).
 *
 * Usage:
 *   node scripts/import-ura-game-from-zip.cjs
 *   node scripts/import-ura-game-from-zip.cjs "C:\\path\\to\\ura-pearl-data-center-main.zip"
 *
 * Default zip path (Windows): Desktop\\urapearlug@gmail.com\\ura-pearl-data-center-main.zip
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const SKIP_FIRST = new Set([
  "admin",
  "auth",
  "collect",
  "cron",
  "fx",
  "health",
  "manifest",
  "payments",
  "programmes",
  "receipts",
  "students",
  "webhooks",
]);

const ROOT = path.join(__dirname, "..");
const DEFAULT_ZIP = path.join(
  process.env.USERPROFILE || "",
  "Desktop",
  "urapearlug@gmail.com",
  "ura-pearl-data-center-main.zip"
);

const zipPath = path.resolve(process.argv[2] || process.env.URPEARL_ZIP || DEFAULT_ZIP);

if (!fs.existsSync(zipPath)) {
  console.error("Zip not found:", zipPath);
  console.error("Pass path as argv[2] or set URPEARL_ZIP.");
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ura-import-"));
try {
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: "inherit" }
  );
} catch (e) {
  console.error("Expand-Archive failed:", e.message);
  process.exit(1);
}

const inner = path.join(tmp, "ura-pearl-data-center-main");
if (!fs.existsSync(inner)) {
  console.error("Expected folder ura-pearl-data-center-main inside zip, got:", fs.readdirSync(tmp));
  process.exit(1);
}

const srcApi = path.join(inner, "app", "api");
const destApi = path.join(ROOT, "app", "api");

function firstSegment(relFromApi) {
  const m = relFromApi.match(/^([^/\\]+)/);
  return m ? m[1] : null;
}

function walkCopy(relDir) {
  const absDir = path.join(srcApi, relDir);
  if (!fs.existsSync(absDir)) {
    console.error("No app/api in zip:", absDir);
    return;
  }
  for (const name of fs.readdirSync(absDir, { withFileTypes: true })) {
    const rel = path.join(relDir, name.name).replace(/\\/g, "/");
    const abs = path.join(absDir, name.name);
    if (name.isDirectory()) {
      const top = firstSegment(rel);
      if (top && SKIP_FIRST.has(top)) {
        console.error("skip tree", path.posix.join("app/api", rel.replace(/\\/g, "/")));
        continue;
      }
      walkCopy(rel);
      continue;
    }
    const top = firstSegment(rel);
    if (top && SKIP_FIRST.has(top)) continue;
    const dest = path.join(destApi, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(abs, dest);
    console.error("wrote", path.relative(ROOT, dest));
  }
}

walkCopy(".");

const srcDocs = path.join(inner, "docs");
const destDocs = path.join(ROOT, "docs", "upstream-ura-game");
if (fs.existsSync(srcDocs)) {
  fs.mkdirSync(destDocs, { recursive: true });
  const readme = `# Upstream game docs (from zip)

Copied from \`docs/\` inside the ura-pearl-data-center archive. Regenerate via \`npm run import:ura-from-zip\` (same run as game APIs).
`;
  fs.writeFileSync(path.join(destDocs, "README.md"), readme, "utf8");
  for (const name of fs.readdirSync(srcDocs, { withFileTypes: true })) {
    if (!name.isFile()) continue;
    const from = path.join(srcDocs, name.name);
    const to = path.join(destDocs, name.name);
    fs.copyFileSync(from, to);
    console.error("wrote", path.relative(ROOT, to));
  }
}

try {
  fs.rmSync(tmp, { recursive: true, force: true });
} catch {
  /* ignore */
}
console.error("Done. Run: npx prisma generate && npm run verify");

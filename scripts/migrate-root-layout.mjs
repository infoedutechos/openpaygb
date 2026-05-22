/**
 * Move Pay app from Next.js `src/` layout to URA Pearl–style root layout:
 *   src/app  -> app/
 *   src/lib  -> lib/
 *   src/components/* merged into components/
 *
 * Requires: no root `app/` or `lib/` folder yet.
 * Windows: `fs.renameSync` often returns EPERM while the IDE has the folder open — use `robocopy … /MOVE`
 * (see docs/STRUCTURE_ALIGNMENT_URA_PEARL.md) or close Cursor / `npm run dev` and re-run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function exists(p) {
  return fs.existsSync(p);
}

const srcApp = path.join(root, "src", "app");
const srcLib = path.join(root, "src", "lib");
const srcComp = path.join(root, "src", "components");
const destApp = path.join(root, "app");
const destLib = path.join(root, "lib");
const destComp = path.join(root, "components");

if (!exists(srcApp)) {
  console.log("migrate-root-layout: src/app not found — already migrated or nothing to do.");
  process.exit(0);
}

if (exists(destApp)) {
  console.error("migrate-root-layout: ./app already exists. Remove or rename it first.");
  process.exit(1);
}
if (exists(destLib)) {
  console.error("migrate-root-layout: ./lib already exists. Remove or rename it first.");
  process.exit(1);
}

fs.renameSync(srcApp, destApp);
console.log("OK: src/app -> app/");

fs.renameSync(srcLib, destLib);
console.log("OK: src/lib -> lib/");

if (exists(srcComp)) {
  if (!exists(destComp)) {
    fs.mkdirSync(destComp, { recursive: true });
  }
  for (const name of fs.readdirSync(srcComp)) {
    const from = path.join(srcComp, name);
    const to = path.join(destComp, name);
    fs.cpSync(from, to, { recursive: true });
  }
  fs.rmSync(srcComp, { recursive: true, force: true });
  console.log("OK: merged src/components -> components/");
}

const srcMid = path.join(root, "src", "middleware.ts");
if (exists(srcMid)) {
  const marker = path.join(root, "middleware.odelhub.ts");
  fs.copyFileSync(srcMid, marker);
  fs.rmSync(srcMid, { force: true });
  console.log("OK: src/middleware.ts -> middleware.odelhub.ts (merge with ./middleware.ts if needed)");
}

const srcRoot = path.join(root, "src");
if (exists(srcRoot)) {
  const left = fs.readdirSync(srcRoot);
  if (left.length === 0) {
    fs.rmSync(srcRoot, { force: true });
    console.log("OK: removed empty src/");
  } else {
    console.warn("migrate-root-layout: src/ still contains:", left.join(", "));
    console.warn("Remove manually after moving any remaining files.");
  }
}

console.log("\nNext: set tsconfig paths \"@/*\": [\"./*\"] and vitest alias @ -> __dirname, then npm run build.");

/**
 * Migrate URA game API routes to apiErrorResponse in catch blocks.
 * Run: node scripts/migrate-game-api-errors.cjs
 * Dry run: node scripts/migrate-game-api-errors.cjs --dry-run
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const apiRoot = path.join(root, "app", "api");

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
  "partner",
  "org",
  "platform",
  "tma",
  "knowledge",
  "docs",
  "notification-social-icon",
]);

const TUITION_ADMIN_KEEP = new Set([
  "app/api/admin/fees-collection/route.ts",
  "app/api/admin/openpay-cards/route.ts",
  "app/api/admin/org-users/route.ts",
  "app/api/admin/organizations/[slug]/detail/route.ts",
  "app/api/admin/payment-requests/route.ts",
  "app/api/admin/search/route.ts",
  "app/api/admin/summary/route.ts",
  "app/api/admin/tuition-balances/route.ts",
]);

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (name === "route.ts") acc.push(p);
  }
  return acc;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function firstSegment(relPath) {
  const m = relPath.match(/^app\/api\/([^/]+)/);
  return m ? m[1] : null;
}

function isGameRoute(relPath) {
  const seg = firstSegment(relPath);
  if (!seg) return false;
  if (seg === "admin") {
    if (TUITION_ADMIN_KEEP.has(relPath)) return false;
    if (relPath.startsWith("app/api/admin/programmes/")) return false;
    return true;
  }
  return !SKIP_FIRST.has(seg);
}

function routeTag(relPath) {
  const inner = relPath.replace(/^app\/api\//, "").replace(/\/route\.ts$/, "");
  return inner;
}

function findCatchBlocks(text) {
  const blocks = [];
  const re = /\} catch \((\w+)\) \{/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const bodyStart = m.index + m[0].length;
    let depth = 1;
    let i = bodyStart;
    while (i < text.length && depth > 0) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      i++;
    }
    const body = text.slice(bodyStart, i - 1);
    blocks.push({
      varName: m[1],
      body,
      start: m.index,
      end: i,
    });
  }
  return blocks;
}

function extractFallback(body) {
  const errMatch = body.match(
    /return\s+NextResponse\.json\(\s*\{[^}]*\berror:\s*['"]([^'"]+)['"]/,
  );
  if (errMatch) return errMatch[1];
  const msgMatch = body.match(
    /return\s+NextResponse\.json\(\s*\{[^}]*\bmessage:\s*['"]([^'"]+)['"]/,
  );
  if (msgMatch) return msgMatch[1];
  return "Request failed";
}

function shouldReplaceCatch(body) {
  if (body.includes("apiErrorResponse")) return false;
  if (!/return\s+NextResponse\.json/.test(body)) return false;
  if (/\bcontinue\b/.test(body)) return false;
  if (/\bthrow\b/.test(body)) return false;
  if (/\bwhile\s*\(/.test(body)) return false;
  if (/\bfor\s*\(/.test(body)) return false;
  if (/\bretries\b/i.test(body)) return false;
  if (/\bMAX_RETRIES\b/.test(body)) return false;
  return true;
}

function ensureImport(text) {
  if (text.includes('from "@/lib/api-error"') || text.includes("from '@/lib/api-error'")) {
    return text;
  }
  const importMatch = text.match(/^import .+;\s*$/m);
  if (!importMatch) {
    return `import { apiErrorResponse } from "@/lib/api-error";\n${text}`;
  }
  const lastImport = [...text.matchAll(/^import .+;\s*$/gm)].pop();
  if (!lastImport) return text;
  const insertAt = lastImport.index + lastImport[0].length;
  return `${text.slice(0, insertAt)}\nimport { apiErrorResponse } from "@/lib/api-error";${text.slice(insertAt)}`;
}

function wrapHandlerIfNeeded(text, route) {
  const fnRe = /export async function (GET|POST|PUT|PATCH|DELETE)\s*\([^)]*\)\s*\{/g;
  let result = text;
  let offset = 0;
  let m;
  const original = text;
  while ((m = fnRe.exec(original)) !== null) {
    const openBrace = m.index + m[0].length - 1;
    let depth = 1;
    let i = openBrace + 1;
    while (i < original.length && depth > 0) {
      if (original[i] === "{") depth++;
      else if (original[i] === "}") depth--;
      i++;
    }
    const fnBody = original.slice(openBrace + 1, i - 1);
    if (/\bcatch\s*\(/.test(fnBody)) continue;
    const trimmed = fnBody.trim();
    if (!trimmed || trimmed.startsWith("try {")) continue;
    const method = m[1];
    const wrapped = `\n  try {${fnBody}\n  } catch (e) {\n    return apiErrorResponse(e, { route: "${route}/${method.toLowerCase()}", fallback: ${JSON.stringify("Request failed")} });\n  }\n`;
    const adjOpen = openBrace + 1 + offset;
    const adjClose = i - 1 + offset;
    result = result.slice(0, adjOpen) + wrapped + result.slice(adjClose);
    offset += wrapped.length - fnBody.length;
  }
  return result;
}

function migrateFile(file, dryRun) {
  const r = rel(file);
  if (!isGameRoute(r)) return { skipped: true, reason: "not-game" };

  let text = fs.readFileSync(file, "utf8");
  if (!/\bcatch\s*\(/.test(text) && !/export async function/.test(text)) {
    return { skipped: true, reason: "no-handlers" };
  }

  const route = routeTag(r);
  let changed = false;

  text = ensureImport(text);
  const blocks = findCatchBlocks(text);
  let result = text;
  let offset = 0;

  for (const block of blocks) {
    if (!shouldReplaceCatch(block.body)) continue;
    const fallback = extractFallback(block.body);
    const fallbackJson = JSON.stringify(fallback);
    const replacement = `} catch (e) {\n    return apiErrorResponse(e, { route: "${route}", fallback: ${fallbackJson} });\n  }`;
    const adjStart = block.start + offset;
    const adjEnd = block.end + offset;
    result = result.slice(0, adjStart) + replacement + result.slice(adjEnd);
    offset += replacement.length - (block.end - block.start);
    changed = true;
  }

  const beforeWrap = result;
  result = wrapHandlerIfNeeded(result, route);
  if (result !== beforeWrap) changed = true;

  if (!changed) return { skipped: true, reason: "already-migrated" };

  if (!dryRun) fs.writeFileSync(file, result, "utf8");
  return { migrated: true, rel: r };
}

const dryRun = process.argv.includes("--dry-run");
const routes = walk(apiRoot).filter((f) => isGameRoute(rel(f)));

let migrated = 0;
let skipped = 0;
for (const file of routes) {
  const out = migrateFile(file, dryRun);
  if (out.migrated) {
    migrated++;
    console.log(`${dryRun ? "[dry-run] " : ""}migrated: ${out.rel}`);
  } else {
    skipped++;
  }
}

console.log("");
console.log(`Game routes scanned: ${routes.length}`);
console.log(`Migrated: ${migrated}`);
console.log(`Skipped: ${skipped}`);
console.log(dryRun ? "(dry run — no files written)" : "Done.");

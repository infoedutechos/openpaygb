/**
 * Reports API route error-handling coverage (apiErrorResponse vs raw catch).
 * Run: node scripts/audit-api-error-hardening.cjs
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const apiRoot = path.join(root, "app", "api");

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (name === "route.ts") acc.push(p);
  }
  return acc;
}

const routes = walk(apiRoot);
const withApi = [];
const catchNoApi = [];
const noCatch = [];

for (const file of routes) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const hasCatch = /catch\s*\(/.test(text);
  const hasApi = text.includes("apiErrorResponse");

  if (hasApi) withApi.push(rel);
  else if (hasCatch) catchNoApi.push(rel);
  else noCatch.push(rel);
}

const tuitionPrefixes = [
  "app/api/public/",
  "app/api/auth/",
  "app/api/student/",
  "app/api/receipts/",
  "app/api/master/",
  "app/api/knowledge/",
  "app/api/platform/",
  "app/api/programmes/",
  "app/api/payments/",
  "app/api/webhooks/livepay/",
  "app/api/webhooks/relworx/",
];

function isTuitionCritical(rel) {
  return tuitionPrefixes.some((p) => rel.startsWith(p));
}

const criticalMissing = catchNoApi.filter(isTuitionCritical);
const criticalNoCatch = noCatch.filter(isTuitionCritical);

console.log("API error hardening audit");
console.log("=========================");
console.log(`Total route handlers: ${routes.length}`);
console.log(`Using apiErrorResponse: ${withApi.length}`);
console.log(`Catch without apiErrorResponse: ${catchNoApi.length}`);
console.log(`No catch block: ${noCatch.length}`);
console.log("");
console.log(`Tuition-critical — catch without apiErrorResponse: ${criticalMissing.length}`);
console.log(`Tuition-critical — no catch: ${criticalNoCatch.length}`);

if (criticalMissing.length) {
  console.log("\nTuition-critical (catch, no apiErrorResponse):");
  criticalMissing.slice(0, 25).forEach((r) => console.log(`  - ${r}`));
  if (criticalMissing.length > 25) console.log(`  ... +${criticalMissing.length - 25} more`);
}

process.exit(0);

/**
 * Lint, unit tests, TypeScript check, Prisma schema validate.
 * Does not run `prisma generate` (avoids Windows EPERM locks on query_engine); use `npm run db:generate` after install.
 */
require("./load-env.cjs");
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  return r.status ?? 1;
}

let code = run("npm", ["run", "lint"]);
if (code !== 0) process.exit(code);

code = run("npm", ["run", "test"]);
if (code !== 0) process.exit(code);

code = run("npx", ["tsc", "--noEmit"]);
if (code !== 0) process.exit(code);

if (!process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = "mongodb://127.0.0.1:27017/_schema_validate_only";
}

code = run("npx", ["prisma", "validate"]);
if (code !== 0) process.exit(code);

console.log("\n[verify] OK — lint, test, types, prisma validate.");
console.log("If Prisma client errors (e.g. after schema change), run: npm run db:generate when no other process locks node_modules.");

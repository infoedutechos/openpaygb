/**
 * Lint, unit tests, TypeScript check, Prisma schema validate.
 * Does not run `prisma generate` (avoids Windows EPERM locks on query_engine); use `npm run db:generate` after install.
 */
require("./load-env.cjs");
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

function quoteWinArg(s) {
  if (!/[\s"]/u.test(s)) return s;
  return `"${String(s).replace(/"/g, '""')}"`;
}

function run(cmd, args) {
  /** `shell: true` breaks when *script paths in argv* contain spaces; `cwd` with spaces is fine with `shell: false`. */
  if (process.platform === "win32") {
    const line = [cmd, ...args].map(quoteWinArg).join(" ");
    const r = spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", line], {
      cwd: root,
      stdio: "inherit",
      shell: false,
      windowsHide: true,
      env: process.env,
    });
    return r.status ?? 1;
  }
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
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

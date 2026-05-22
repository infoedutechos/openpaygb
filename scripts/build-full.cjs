/**
 * Cross-platform full build: optional .next clean, prisma generate, next build.
 * Use when PowerShell does not support `&&` in older versions.
 */
/* eslint-disable no-console */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

function run(cmd, args) {
  /** `shell: true` breaks when *script paths in argv* contain spaces; `cwd` with spaces is fine with `shell: false`. */
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false, windowsHide: true });
  return r.status ?? 1;
}

const npmCli = process.platform === "win32" ? "npm.cmd" : "npm";

let code = run(process.execPath, [path.join(__dirname, "clean-next.cjs")]);
if (code !== 0) process.exit(code);

console.log("\n[build:full] prisma generate…");
code = run(npmCli, ["run", "db:generate"]);
if (code !== 0) {
  console.error(`[build:full] prisma generate failed (exit ${code})`);
  process.exit(code);
}

console.log("\n[build:full] next build…");
code = run(npmCli, ["run", "build:next"]);
if (code !== 0) console.error(`[build:full] next build failed (exit ${code})`);
process.exit(code);

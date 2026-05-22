/* eslint-disable no-console */
/** Kill port 3000, fully remove .next, then start next dev. */
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const clean = path.join(__dirname, "clean-next.cjs");
const dev = path.join(__dirname, "run-next-dev.cjs");
const { ensurePrismaClient } = require("./ensure-prisma-client.cjs");

console.log("[dev:reset] Syncing Prisma client with schema…\n");
try {
  ensurePrismaClient(root);
} catch {
  process.exit(1);
}

console.log("[dev:reset] Stopping dev servers (ports 3000–3001) and removing .next…\n");
const r = spawnSync(process.execPath, [clean, "--kill-port"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, CLEAN_NEXT_KILL_PORT: "1" },
});
if (r.status !== 0) process.exit(r.status ?? 1);

console.log("\n[dev:reset] Starting next dev…\n");
const child = spawnSync(process.execPath, [dev], { cwd: root, stdio: "inherit" });
process.exit(child.status ?? 1);

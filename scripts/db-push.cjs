require("./load-env.cjs");
const { spawnSync } = require("child_process");

if (!process.env.DATABASE_URL?.trim()) {
  console.error("Missing DATABASE_URL (or MONGODB_URI) in .env.local / .env");
  process.exit(1);
}

const path = require("path");
const { ensurePrismaClient } = require("./ensure-prisma-client.cjs");

const root = path.resolve(__dirname, "..");
const extra = process.argv.slice(2);
const args = ["prisma", "db", "push"];
if (!extra.includes("--skip-generate")) {
  args.push("--skip-generate");
}
args.push(...extra);
const r = spawnSync("npx", args, {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: process.env,
});
if (r.status !== 0) process.exit(r.status ?? 1);

if (!extra.includes("--skip-generate")) {
  try {
    ensurePrismaClient(root);
  } catch {
    process.exit(1);
  }
}
process.exit(0);

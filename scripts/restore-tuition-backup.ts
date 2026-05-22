/**
 * Restore tuition data from an ODELHUB Pay backup JSON file.
 *
 *   npx tsx scripts/restore-tuition-backup.ts --file backup.json --dry-run
 *   npx tsx scripts/restore-tuition-backup.ts --file backup.json --replace --confirm RESTORE
 *   npx tsx scripts/restore-tuition-backup.ts --file backup.json --merge --confirm RESTORE
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { parseBackupJson, restoreTuitionBackup, type RestoreMode } from "../lib/backup/tuition-restore";

config({ path: resolve(process.cwd(), ".env.local") });
config();

if (!process.env.DATABASE_URL?.trim() && process.env.MONGODB_URI?.trim()) {
  process.env.DATABASE_URL = process.env.MONGODB_URI.trim();
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const file = arg("--file") ?? arg("-f");
const dryRun = process.argv.includes("--dry-run");
const replace = process.argv.includes("--replace");
const merge = process.argv.includes("--merge");
const confirm = arg("--confirm");

if (!file) {
  console.error(
    "Usage: npx tsx scripts/restore-tuition-backup.ts --file <backup.json> [--dry-run | --replace | --merge] [--confirm RESTORE]",
  );
  process.exit(1);
}

let mode: RestoreMode = "dryRun";
if (replace) mode = "replaceTuition";
else if (merge) mode = "mergeUpsert";

if (mode !== "dryRun" && confirm !== "RESTORE") {
  console.error("Destructive restore requires --confirm RESTORE");
  process.exit(1);
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const text = readFileSync(resolve(file), "utf8");

let snapshot: unknown;
try {
  snapshot = parseBackupJson(text);
} catch (e) {
  console.error("Invalid JSON:", e instanceof Error ? e.message : e);
  process.exit(1);
}

console.log(`[restore] mode=${mode} file=${file}`);
const report = await restoreTuitionBackup({ raw: snapshot, mode });

console.log(JSON.stringify(report, null, 2));

if (report.issues.some((i) => i.level === "error")) {
  process.exit(2);
}

if (!report.dryRun && mode === "replaceTuition") {
  console.log("\nRestore complete. Run: npm run master:set-login");
}

process.exit(0);

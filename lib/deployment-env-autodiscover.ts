import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  createCustomRegistryEntry,
  listCustomRegistryEntries,
} from "@/lib/deployment-env-custom-registry";
import {
  deploymentEnvRegistryNames,
  getDeploymentEnvDefinition,
} from "@/lib/deployment-env-registry";

const SCAN_ROOTS = ["app", "lib", "utils", "components", "hooks", "middleware.ts", "next.config.ts"] as const;

const IGNORE_NAMES = new Set([
  "NODE_ENV",
  "PATH",
  "HOME",
  "USER",
  "PWD",
  "CI",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_REGION",
  "npm_package_version",
]);

const ENV_PATTERNS = [
  /deploymentEnv(?:Async)?\s*\(\s*["']([A-Z][A-Z0-9_]{0,63})["']/g,
  /process\.env\.([A-Z][A-Z0-9_]{1,63})\b/g,
  /process\.env\[["']([A-Z][A-Z0-9_]{1,63})["']\]/g,
];

let cachedScan: { at: number; names: Set<string> } | null = null;
const SCAN_TTL_MS = 10 * 60 * 1000;

function repoRoot(): string {
  return process.cwd();
}

function isCodeFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|cjs|mjs)$/.test(filePath);
}

function walkFiles(relPath: string, out: string[]): void {
  const abs = path.join(repoRoot(), relPath);
  if (!fs.existsSync(abs)) return;
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    if (isCodeFile(abs)) out.push(abs);
    return;
  }
  for (const entry of fs.readdirSync(abs)) {
    if (entry === "node_modules" || entry === ".next" || entry === "__tests__") continue;
    walkFiles(path.join(relPath, entry), out);
  }
}

function humanizeEnvName(name: string): string {
  return name
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function discoverEnvVarNamesFromCodebase(): Set<string> {
  const now = Date.now();
  if (cachedScan && now - cachedScan.at < SCAN_TTL_MS) {
    return new Set(cachedScan.names);
  }

  const files: string[] = [];
  for (const root of SCAN_ROOTS) walkFiles(root, files);

  const found = new Set<string>();
  for (const file of files) {
    let text: string;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const pattern of ENV_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1];
        if (!name || IGNORE_NAMES.has(name)) continue;
        if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(name)) continue;
        found.add(name);
      }
    }
  }

  cachedScan = { at: now, names: found };
  return found;
}

export type AutodiscoverRegistryResult = {
  scanned: number;
  added: string[];
  skippedExisting: number;
};

/** Register codebase env names missing from built-in + custom registry. */
export async function autodiscoverDeploymentEnvRegistry(): Promise<AutodiscoverRegistryResult> {
  const discovered = discoverEnvVarNamesFromCodebase();
  const builtin = new Set(deploymentEnvRegistryNames());
  const custom = await listCustomRegistryEntries();
  const customNames = new Set(custom.map((c) => c.name));

  const added: string[] = [];
  let skippedExisting = 0;

  for (const name of [...discovered].sort()) {
    if (builtin.has(name) || customNames.has(name)) {
      skippedExisting += 1;
      continue;
    }
    if (getDeploymentEnvDefinition(name)) {
      skippedExisting += 1;
      continue;
    }
    try {
      await createCustomRegistryEntry({
        name,
        label: humanizeEnvName(name),
        description: `Auto-discovered from codebase references to ${name}.`,
        sensitive: !name.startsWith("NEXT_PUBLIC_"),
        requirement: "optional",
        createdBy: "autonomous-discovery",
      });
      added.push(name);
      customNames.add(name);
    } catch {
      /* race or duplicate — ignore */
    }
  }

  return { scanned: discovered.size, added, skippedExisting };
}

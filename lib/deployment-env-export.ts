import "server-only";

import { getMergedDeploymentEnvRegistryNames } from "@/lib/deployment-env-registry";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";

function quoteEnvValue(value: string): string {
  if (/[\s#"']/.test(value) || value.includes("=")) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

/** Build `.env` text for Vercel import (paste into Environment Variables or upload). */
export async function buildVercelEnvExport(): Promise<string> {
  await warmDeploymentEnvCache();
  const lines: string[] = [
    "# ODEL HUB — export for Vercel Environment Variables",
    "# Generated from merged dashboard overrides + server process env.",
    "# Paste at: Vercel project → Settings → Environment Variables → Import .env",
    "# Review sensitive values before committing this file anywhere.",
    "",
  ];

  let count = 0;
  const names = await getMergedDeploymentEnvRegistryNames();
  for (const name of names.sort()) {
    const value = deploymentEnv(name)?.trim();
    if (!value) continue;
    lines.push(`${name}=${quoteEnvValue(value)}`);
    count += 1;
  }

  lines.push("", `# ${count} variable(s) exported`);
  return `${lines.join("\n")}\n`;
}

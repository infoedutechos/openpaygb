import "server-only";

import { loadDeploymentEnvOverrideMap } from "@/lib/deployment-env-overrides";

let overrideCache: Map<string, string> | null = null;
let loadPromise: Promise<void> | null = null;

export function invalidateDeploymentEnvCache(): void {
  overrideCache = null;
  loadPromise = null;
}

export async function refreshDeploymentEnvCache(): Promise<void> {
  overrideCache = await loadDeploymentEnvOverrideMap();
  loadPromise = null;
}

async function ensureCache(): Promise<void> {
  if (overrideCache) return;
  if (!loadPromise) {
    loadPromise = loadDeploymentEnvOverrideMap().then((map) => {
      overrideCache = map;
    });
  }
  await loadPromise;
}

/** Resolved value: Master dashboard override wins over process.env. */
export function deploymentEnv(name: string): string {
  const fromDashboard = overrideCache?.get(name);
  if (fromDashboard !== undefined) return fromDashboard.trim();
  return process.env[name]?.trim() ?? "";
}

export async function deploymentEnvAsync(name: string): Promise<string> {
  await ensureCache();
  return deploymentEnv(name);
}

/** Warm override cache before handling payments / webhooks. */
export async function warmDeploymentEnvCache(): Promise<void> {
  await ensureCache();
}

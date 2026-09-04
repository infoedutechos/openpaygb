import "server-only";

import { loadDeploymentEnvOverrideMap } from "@/lib/deployment-env-overrides";

/** How long an isolate may keep MAC overrides before reloading from Mongo (no redeploy needed). */
export const DEPLOYMENT_ENV_CACHE_TTL_MS = 30_000;

let overrideCache: Map<string, string> | null = null;
let cacheLoadedAtMs = 0;
let loadPromise: Promise<void> | null = null;

export function invalidateDeploymentEnvCache(): void {
  overrideCache = null;
  cacheLoadedAtMs = 0;
  loadPromise = null;
}

function cacheIsFresh(): boolean {
  if (!overrideCache) return false;
  return Date.now() - cacheLoadedAtMs < DEPLOYMENT_ENV_CACHE_TTL_MS;
}

export async function refreshDeploymentEnvCache(): Promise<void> {
  overrideCache = await loadDeploymentEnvOverrideMap();
  cacheLoadedAtMs = Date.now();
  loadPromise = null;
}

async function ensureCache(opts?: { force?: boolean }): Promise<void> {
  const force = opts?.force === true;
  if (!force && cacheIsFresh()) return;

  if (!loadPromise) {
    loadPromise = loadDeploymentEnvOverrideMap()
      .then((map) => {
        overrideCache = map;
        cacheLoadedAtMs = Date.now();
      })
      .finally(() => {
        loadPromise = null;
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

/**
 * Warm MAC override cache before payments / webhooks.
 * Reloads from Mongo when empty or TTL expired — no Vercel redeploy required.
 */
export async function warmDeploymentEnvCache(opts?: { force?: boolean }): Promise<void> {
  await ensureCache(opts);
}

/** BOT_TOKEN wins over TELEGRAM_BOT_TOKEN (both respect Master dashboard overrides). */
export function resolvedBotToken(): string {
  return deploymentEnv("BOT_TOKEN") || deploymentEnv("TELEGRAM_BOT_TOKEN");
}

import "server-only";

import { autodiscoverDeploymentEnvRegistry } from "@/lib/deployment-env-autodiscover";
import {
  isAutonomousDeploymentEnvSyncEnabled,
  syncDeploymentEnvToVercel,
  type VercelSyncResult,
} from "@/lib/deployment-env-vercel-sync";
import type { AutodiscoverRegistryResult } from "@/lib/deployment-env-autodiscover";

export type DeploymentEnvAutonomousResult = {
  registry: AutodiscoverRegistryResult;
  vercel: VercelSyncResult | null;
};

/** Scan codebase for env names (fast; cached file walk). */
export async function runRegistryAutodiscover(): Promise<AutodiscoverRegistryResult> {
  try {
    return await autodiscoverDeploymentEnvRegistry();
  } catch (e) {
    console.warn("[deployment-env] registry autodiscover failed", e);
    return { scanned: 0, added: [], skippedExisting: 0 };
  }
}

/** Scan codebase for env names and optionally push merged values to Vercel. */
export async function runDeploymentEnvAutonomousTasks(opts?: {
  syncVercel?: boolean;
}): Promise<DeploymentEnvAutonomousResult> {
  const registry = await runRegistryAutodiscover();

  let vercel: VercelSyncResult | null = null;
  const shouldSync = opts?.syncVercel === true && isAutonomousDeploymentEnvSyncEnabled();
  if (shouldSync) {
    vercel = await syncDeploymentEnvToVercel();
  }

  return { registry, vercel };
}

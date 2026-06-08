import "server-only";

import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { buildVercelEnvExport } from "@/lib/deployment-env-export";
import {
  getMergedDeploymentEnvGroups,
  type EnvRequirement,
} from "@/lib/deployment-env-registry";

export type VercelEnvTarget = "production" | "preview" | "development";

export type VercelSyncResult = {
  ok: boolean;
  configured: boolean;
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  message: string | null;
};

type VercelProjectEnv = {
  id: string;
  key: string;
  target?: VercelEnvTarget[];
};

export function vercelTargetsForRequirement(req: EnvRequirement): VercelEnvTarget[] {
  switch (req) {
    case "all":
      return ["production", "preview", "development"];
    case "always":
      return ["production", "preview"];
    case "production":
      return ["production"];
    default:
      return ["production", "preview"];
  }
}

export function isVercelSyncConfigured(): boolean {
  return Boolean(
    deploymentEnv("VERCEL_ACCESS_TOKEN") && deploymentEnv("VERCEL_PROJECT_ID"),
  );
}

export function isAutonomousDeploymentEnvSyncEnabled(): boolean {
  const flag = deploymentEnv("DEPLOYMENT_ENV_AUTONOMOUS_SYNC").toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return isVercelSyncConfigured();
}

function vercelUrl(apiPath: string, teamId: string): string {
  const url = new URL(`https://api.vercel.com${apiPath}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  return url.toString();
}

async function listProjectEnvs(
  token: string,
  projectId: string,
  teamId: string,
): Promise<VercelProjectEnv[]> {
  const url = vercelUrl(`/v9/projects/${encodeURIComponent(projectId)}/env`, teamId);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Vercel list env failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { envs?: VercelProjectEnv[] };
  return data.envs ?? [];
}

async function createProjectEnv(
  token: string,
  projectId: string,
  teamId: string,
  key: string,
  value: string,
  targets: VercelEnvTarget[],
  sensitive: boolean,
): Promise<void> {
  const url = vercelUrl(`/v10/projects/${encodeURIComponent(projectId)}/env`, teamId);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key,
      value,
      type: sensitive ? "encrypted" : "plain",
      target: targets,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Vercel create ${key} failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

async function updateProjectEnv(
  token: string,
  projectId: string,
  teamId: string,
  envId: string,
  value: string,
  targets: VercelEnvTarget[],
  sensitive: boolean,
): Promise<void> {
  const url = vercelUrl(
    `/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(envId)}`,
    teamId,
  );
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      value,
      type: sensitive ? "encrypted" : "plain",
      target: targets,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Vercel update env ${envId} failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

function parseEnvExport(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) map.set(key, value);
  }
  return map;
}

/** Push merged dashboard + server env values to the configured Vercel project. */
export async function syncDeploymentEnvToVercel(): Promise<VercelSyncResult> {
  await warmDeploymentEnvCache();

  const token = deploymentEnv("VERCEL_ACCESS_TOKEN");
  const projectId = deploymentEnv("VERCEL_PROJECT_ID");
  const teamId = deploymentEnv("VERCEL_TEAM_ID");

  if (!token || !projectId) {
    return {
      ok: true,
      configured: false,
      synced: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      message: "Set VERCEL_ACCESS_TOKEN and VERCEL_PROJECT_ID to enable autonomous Vercel sync.",
    };
  }

  const groups = await getMergedDeploymentEnvGroups();
  const requirementByName = new Map(
    groups.flatMap((g) => g.vars.map((v) => [v.name, v.requirement] as const)),
  );
  const sensitiveByName = new Map(
    groups.flatMap((g) => g.vars.map((v) => [v.name, v.sensitive] as const)),
  );

  const exportText = await buildVercelEnvExport();
  const values = parseEnvExport(exportText);

  const skipKeys = new Set([
    "VERCEL_ACCESS_TOKEN",
    "VERCEL_PROJECT_ID",
    "VERCEL_TEAM_ID",
    "DEPLOYMENT_ENV_AUTONOMOUS_SYNC",
  ]);

  let existing: VercelProjectEnv[] = [];
  const errors: string[] = [];
  try {
    existing = await listProjectEnvs(token, projectId, teamId);
  } catch (e) {
    return {
      ok: false,
      configured: true,
      synced: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [e instanceof Error ? e.message : "Vercel list failed"],
      message: "Could not list Vercel project environment variables.",
    };
  }

  const byKey = new Map<string, VercelProjectEnv[]>();
  for (const row of existing) {
    const list = byKey.get(row.key) ?? [];
    list.push(row);
    byKey.set(row.key, list);
  }

  let synced = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [key, value] of values) {
    if (skipKeys.has(key) || !value.trim()) {
      skipped += 1;
      continue;
    }

    const requirement = requirementByName.get(key) ?? "optional";
    const targets = vercelTargetsForRequirement(requirement);
    const sensitive = sensitiveByName.get(key) ?? !key.startsWith("NEXT_PUBLIC_");
    const rows = byKey.get(key) ?? [];

    try {
      if (rows.length === 0) {
        await createProjectEnv(token, projectId, teamId, key, value, targets, sensitive);
        created += 1;
        synced += 1;
      } else {
        await updateProjectEnv(token, projectId, teamId, rows[0].id, value, targets, sensitive);
        updated += 1;
        synced += 1;
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `${key}: sync failed`);
    }
  }

  return {
    ok: errors.length === 0,
    configured: true,
    synced,
    created,
    updated,
    skipped,
    errors,
    message:
      errors.length === 0
        ? `Synced ${synced} variable(s) to Vercel (${created} created, ${updated} updated).`
        : `Synced ${synced} with ${errors.length} error(s).`,
  };
}

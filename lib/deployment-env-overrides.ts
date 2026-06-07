import "server-only";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import {
  decryptDeploymentEnvValue,
  encryptDeploymentEnvValue,
} from "@/lib/deployment-env-crypto";
import { resolveDeploymentEnvDefinition } from "@/lib/deployment-env-custom-registry";

function deploymentEnvOverrideClient() {
  const client = prisma.deploymentEnvOverride;
  if (!client) {
    throw new Error(
      "Prisma client is missing DeploymentEnvOverride. Stop dev servers, then run: npm run db:generate && npm run dev",
    );
  }
  return client;
}

export type DeploymentEnvOverrideMeta = {
  name: string;
  sensitive: boolean;
  updatedAt: string;
  updatedBy: string;
};

export async function listDeploymentEnvOverrideNames(): Promise<DeploymentEnvOverrideMeta[]> {
  const rows = await withPrismaRetry(() =>
    deploymentEnvOverrideClient().findMany({
      orderBy: { name: "asc" },
      select: { name: true, sensitive: true, updatedAt: true, updatedBy: true },
    }),
  );
  return rows.map((r) => ({
    name: r.name,
    sensitive: r.sensitive,
    updatedAt: r.updatedAt.toISOString(),
    updatedBy: r.updatedBy,
  }));
}

export async function loadDeploymentEnvOverrideMap(): Promise<Map<string, string>> {
  const rows = await withPrismaRetry(() => deploymentEnvOverrideClient().findMany());
  const map = new Map<string, string>();
  for (const row of rows) {
    try {
      map.set(row.name, decryptDeploymentEnvValue(row.valueEnc));
    } catch (e) {
      console.error(`[deployment-env] Failed to decrypt ${row.name}:`, e);
    }
  }
  return map;
}

export type PatchDeploymentEnvInput = {
  updates?: Record<string, string | null | undefined>;
  clear?: string[];
  updatedBy?: string;
};

export async function patchDeploymentEnvOverrides(
  input: PatchDeploymentEnvInput,
): Promise<{ saved: string[]; cleared: string[] }> {
  const saved: string[] = [];
  const cleared: string[] = [];

  const updates = input.updates ?? {};
  for (const [name, value] of Object.entries(updates)) {
    const def = await resolveDeploymentEnvDefinition(name);
    if (!def) {
      throw new Error(`Unknown environment variable: ${name}`);
    }
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (!trimmed) {
      await withPrismaRetry(() =>
        deploymentEnvOverrideClient().deleteMany({ where: { name } }),
      );
      cleared.push(name);
      continue;
    }
    await withPrismaRetry(() =>
      deploymentEnvOverrideClient().upsert({
        where: { name },
        create: {
          name,
          valueEnc: encryptDeploymentEnvValue(trimmed),
          sensitive: def.sensitive,
          updatedBy: input.updatedBy?.trim() ?? "",
        },
        update: {
          valueEnc: encryptDeploymentEnvValue(trimmed),
          sensitive: def.sensitive,
          updatedBy: input.updatedBy?.trim() ?? "",
        },
      }),
    );
    saved.push(name);
  }

  for (const name of input.clear ?? []) {
    if (!(await resolveDeploymentEnvDefinition(name))) continue;
    await withPrismaRetry(() =>
      deploymentEnvOverrideClient().deleteMany({ where: { name } }),
    );
    if (!cleared.includes(name)) cleared.push(name);
  }

  return { saved, cleared };
}

import "server-only";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import {
  getDeploymentEnvDefinition,
  type EnvRequirement,
  type EnvVarDefinition,
} from "@/lib/deployment-env-registry";

const ENV_NAME_RE = /^[A-Z][A-Z0-9_]{0,63}$/;

export type CustomRegistryRow = {
  name: string;
  label: string;
  description: string;
  sensitive: boolean;
  requirement: EnvRequirement;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

function registryCustomClient() {
  return prisma.deploymentEnvRegistryCustom ?? null;
}

function requireRegistryCustomClient() {
  const client = registryCustomClient();
  if (!client) {
    throw new Error(
      "Prisma client is missing DeploymentEnvRegistryCustom. Stop dev servers, then run: npm run db:generate && npm run dev",
    );
  }
  return client;
}

export function normalizeCustomEnvVarName(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

export function validateCustomEnvVarName(name: string): string | null {
  const n = normalizeCustomEnvVarName(name);
  if (!n) return "Name is required";
  if (!ENV_NAME_RE.test(n)) {
    return "Use UPPER_SNAKE_CASE (letters, numbers, underscore; start with a letter)";
  }
  if (getDeploymentEnvDefinition(n)) {
    return `${n} is already in the built-in registry`;
  }
  return null;
}

function parseRequirement(raw: string): EnvRequirement {
  const v = raw.trim().toLowerCase();
  if (v === "always" || v === "production" || v === "optional") return v;
  return "optional";
}

function rowToDefinition(row: {
  name: string;
  label: string;
  description: string;
  sensitive: boolean;
  requirement: string;
}): EnvVarDefinition {
  return {
    name: row.name,
    label: row.label.trim() || row.name,
    description: row.description.trim(),
    sensitive: row.sensitive,
    requirement: parseRequirement(row.requirement),
  };
}

export async function listCustomRegistryEntries(): Promise<CustomRegistryRow[]> {
  const rows = await withPrismaRetry(() =>
    registryCustomClient().findMany({ orderBy: { name: "asc" } }),
  );
  return rows.map((r) => ({
    name: r.name,
    label: r.label,
    description: r.description,
    sensitive: r.sensitive,
    requirement: parseRequirement(r.requirement),
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getCustomEnvVarDefinition(name: string): Promise<EnvVarDefinition | undefined> {
  const client = registryCustomClient();
  if (!client) return undefined;
  const row = await withPrismaRetry(() => client.findUnique({ where: { name } }));
  return row ? rowToDefinition(row) : undefined;
}

export async function resolveDeploymentEnvDefinition(name: string): Promise<EnvVarDefinition | undefined> {
  return getDeploymentEnvDefinition(name) ?? (await getCustomEnvVarDefinition(name));
}

export async function isRegistryNameAllowed(name: string): Promise<boolean> {
  return Boolean(await resolveDeploymentEnvDefinition(name));
}

export async function createCustomRegistryEntry(input: {
  name: string;
  label: string;
  description?: string;
  sensitive?: boolean;
  requirement?: EnvRequirement;
  createdBy?: string;
}): Promise<CustomRegistryRow> {
  const name = normalizeCustomEnvVarName(input.name);
  const err = validateCustomEnvVarName(name);
  if (err) throw new Error(err);

  const client = requireRegistryCustomClient();
  const existing = await withPrismaRetry(() => client.findUnique({ where: { name } }));
  if (existing) throw new Error(`${name} is already in the custom registry`);

  const row = await withPrismaRetry(() =>
    client.create({
      data: {
        name,
        label: input.label.trim() || name,
        description: (input.description ?? "").trim(),
        sensitive: input.sensitive !== false,
        requirement: input.requirement ?? "optional",
        createdBy: input.createdBy?.trim() ?? "",
      },
    }),
  );

  return {
    name: row.name,
    label: row.label,
    description: row.description,
    sensitive: row.sensitive,
    requirement: parseRequirement(row.requirement),
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteCustomRegistryEntry(name: string): Promise<{ deleted: string }> {
  const n = normalizeCustomEnvVarName(name);
  if (getDeploymentEnvDefinition(n)) {
    throw new Error("Built-in registry variables cannot be removed");
  }

  const client = requireRegistryCustomClient();
  const deleted = await withPrismaRetry(() => client.deleteMany({ where: { name: n } }));
  if (deleted.count === 0) {
    throw new Error("Custom registry entry not found");
  }

  await withPrismaRetry(() => prisma.deploymentEnvOverride.deleteMany({ where: { name: n } }));

  return { deleted: n };
}

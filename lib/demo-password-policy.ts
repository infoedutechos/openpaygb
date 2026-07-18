import "server-only";

import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import {
  encryptDeploymentEnvValue,
} from "@/lib/deployment-env-crypto";
import {
  DEMO_LOGIN_SLOT_KEYS,
  DEMO_LOGIN_SLOT_META,
  resolveDemoLoginMeta,
  type DemoLoginSlotKey,
  type DemoLoginStored,
} from "@/lib/demo-logins-shared";
import { loadDemoLoginDirectory } from "@/lib/demo-logins";

export type DemoPasswordPolicy = {
  /** Block self-service password change / forgot / reset for demo accounts. */
  lockSelfService: boolean;
  /** Keep MAC publicPasswordHint + SEED_* in sync when a demo password changes. */
  syncChangesToMac: boolean;
};

export const DEFAULT_DEMO_PASSWORD_POLICY: DemoPasswordPolicy = {
  lockSelfService: true,
  syncChangesToMac: true,
};

export async function loadDemoPasswordPolicy(): Promise<DemoPasswordPolicy> {
  const row = await prisma.siteUiSettings.findUnique({
    where: { key: PLATFORM_SITE_UI_KEY },
    select: { demoPasswordLock: true, demoPasswordSync: true },
  });
  return {
    lockSelfService: row?.demoPasswordLock ?? DEFAULT_DEMO_PASSWORD_POLICY.lockSelfService,
    syncChangesToMac: row?.demoPasswordSync ?? DEFAULT_DEMO_PASSWORD_POLICY.syncChangesToMac,
  };
}

export async function saveDemoPasswordPolicy(
  patch: Partial<DemoPasswordPolicy>,
): Promise<DemoPasswordPolicy> {
  const current = await loadDemoPasswordPolicy();
  const next: DemoPasswordPolicy = {
    lockSelfService:
      patch.lockSelfService !== undefined ? patch.lockSelfService : current.lockSelfService,
    syncChangesToMac:
      patch.syncChangesToMac !== undefined ? patch.syncChangesToMac : current.syncChangesToMac,
  };
  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: {
      key: PLATFORM_SITE_UI_KEY,
      demoPasswordLock: next.lockSelfService,
      demoPasswordSync: next.syncChangesToMac,
    },
    update: {
      demoPasswordLock: next.lockSelfService,
      demoPasswordSync: next.syncChangesToMac,
    },
  });
  return next;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findDemoAdminSlotByEmail(
  email: string,
): Promise<{ key: DemoLoginSlotKey; meta: (typeof DEMO_LOGIN_SLOT_META)[DemoLoginSlotKey] } | null> {
  const directory = await loadDemoLoginDirectory();
  const needle = normalizeEmail(email);
  for (const key of DEMO_LOGIN_SLOT_KEYS) {
    const meta = DEMO_LOGIN_SLOT_META[key];
    if (meta.kind !== "admin") continue;
    if (normalizeEmail(directory[key].email) === needle) {
      return { key, meta };
    }
  }
  return null;
}

export async function findDemoStudentSlot(opts: {
  email: string;
  organizationId: string;
}): Promise<{ key: DemoLoginSlotKey; meta: (typeof DEMO_LOGIN_SLOT_META)[DemoLoginSlotKey] } | null> {
  const directory = await loadDemoLoginDirectory();
  const needle = normalizeEmail(opts.email);
  for (const key of DEMO_LOGIN_SLOT_KEYS) {
    const meta = DEMO_LOGIN_SLOT_META[key];
    if (meta.kind !== "student") continue;
    const stored = directory[key];
    if (normalizeEmail(stored.email) !== needle) continue;
    const { orgSlug } = resolveDemoLoginMeta(key, stored);
    if (!orgSlug) continue;
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });
    if (org?.id === opts.organizationId) {
      return { key, meta };
    }
  }
  return null;
}

const LOCK_MESSAGE =
  "This is a shared demo account. Password changes are locked by Master Admin — ask the platform master to update it under Demo logins.";

export async function enforceDemoPasswordChange(opts: {
  kind: "admin" | "student";
  email: string;
  organizationId?: string | null;
}): Promise<{ ok: true; slot: DemoLoginSlotKey | null; policy: DemoPasswordPolicy } | { ok: false; error: string; status: number }> {
  const policy = await loadDemoPasswordPolicy();
  const slot =
    opts.kind === "admin"
      ? await findDemoAdminSlotByEmail(opts.email)
      : opts.organizationId
        ? await findDemoStudentSlot({ email: opts.email, organizationId: opts.organizationId })
        : null;

  if (slot && policy.lockSelfService) {
    return { ok: false, error: LOCK_MESSAGE, status: 403 };
  }

  return { ok: true, slot: slot?.key ?? null, policy };
}

async function upsertSeedEnv(name: string, value: string, updatedBy: string) {
  const valueEnc = encryptDeploymentEnvValue(value);
  await prisma.deploymentEnvOverride.upsert({
    where: { name },
    create: {
      name,
      valueEnc,
      sensitive: name.includes("PASSWORD"),
      updatedBy,
    },
    update: {
      valueEnc,
      sensitive: name.includes("PASSWORD"),
      updatedBy,
    },
  });
}

/**
 * After a successful password change on a demo account (when sync is enabled),
 * update MAC publicPasswordHint + SEED_* so lobbies / downloads stay accurate.
 */
export async function syncDemoPasswordToMac(opts: {
  slotKey: DemoLoginSlotKey;
  password: string;
  updatedBy?: string;
}): Promise<void> {
  const policy = await loadDemoPasswordPolicy();
  if (!policy.syncChangesToMac) return;

  const directory = await loadDemoLoginDirectory();
  const meta = DEMO_LOGIN_SLOT_META[opts.slotKey];
  const prev = directory[opts.slotKey];
  const next: DemoLoginStored = {
    ...prev,
    publicPasswordHint: opts.password,
  };
  directory[opts.slotKey] = next;

  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: {
      key: PLATFORM_SITE_UI_KEY,
      demoLoginDirectory: directory,
    },
    update: {
      demoLoginDirectory: directory,
    },
  });

  const by = opts.updatedBy?.trim() || "demo-password-sync";
  if (meta.seedPasswordEnv) {
    await upsertSeedEnv(meta.seedPasswordEnv, opts.password, by);
  }
}

import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import {
  decryptDeploymentEnvValue,
  encryptDeploymentEnvValue,
} from "@/lib/deployment-env-crypto";
import {
  DEMO_LOGIN_SLOT_KEYS,
  DEMO_LOGIN_SLOT_META,
  defaultDemoLoginDirectory,
  type DemoLoginDirectory,
  type DemoLoginSlotKey,
  type DemoLoginStored,
} from "@/lib/demo-logins-shared";

export {
  DEMO_LOGIN_SLOT_KEYS,
  DEMO_LOGIN_SLOT_META,
  defaultDemoLoginDirectory,
  type DemoLoginDirectory,
  type DemoLoginSlotKey,
  type DemoLoginStored,
} from "@/lib/demo-logins-shared";

export type DemoLoginView = {
  key: DemoLoginSlotKey;
  label: string;
  kind: "admin" | "student";
  role: "master" | "org_admin" | null;
  orgSlug: string | null;
  orgName: string | null;
  loginPath: string;
  email: string;
  name: string;
  userId: string | null;
  exists: boolean;
  hasPassword: boolean;
  portalSignInEnabled?: boolean;
};

export type DemoLoginPatch = {
  key: DemoLoginSlotKey;
  email?: string;
  name?: string;
  password?: string;
  provisionIfMissing?: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isDirectory(value: unknown): value is DemoLoginDirectory {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function loadDemoLoginDirectory(): Promise<Record<DemoLoginSlotKey, DemoLoginStored>> {
  const defaults = defaultDemoLoginDirectory();
  const row = await prisma.siteUiSettings.findUnique({
    where: { key: PLATFORM_SITE_UI_KEY },
    select: { demoLoginDirectory: true },
  });
  const stored = isDirectory(row?.demoLoginDirectory) ? row!.demoLoginDirectory : {};
  const merged = { ...defaults };
  for (const key of DEMO_LOGIN_SLOT_KEYS) {
    const entry = stored[key];
    if (entry && typeof entry === "object") {
      const email =
        typeof entry.email === "string" && entry.email.trim()
          ? normalizeEmail(entry.email)
          : defaults[key].email;
      const name =
        typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : defaults[key].name;
      merged[key] = { email, name };
    }
  }
  return merged;
}

async function saveDemoLoginDirectory(directory: Record<DemoLoginSlotKey, DemoLoginStored>) {
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

export async function listDemoLoginsForMaster(): Promise<DemoLoginView[]> {
  const directory = await loadDemoLoginDirectory();
  const views: DemoLoginView[] = [];

  for (const key of DEMO_LOGIN_SLOT_KEYS) {
    const meta = DEMO_LOGIN_SLOT_META[key];
    const stored = directory[key];
    let orgName: string | null = null;
    let orgId: string | null = null;
    if (meta.orgSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: meta.orgSlug },
        select: { id: true, name: true },
      });
      orgId = org?.id ?? null;
      orgName = org?.name ?? null;
    }

    if (meta.kind === "admin") {
      let admin = await prisma.adminUser.findUnique({
        where: { email: stored.email },
        select: { id: true, email: true, name: true, role: true, passwordHash: true, organizationId: true },
      });
      if (!admin && meta.role === "master") {
        admin = await prisma.adminUser.findFirst({
          where: { role: "master" },
          orderBy: { createdAt: "asc" },
          select: { id: true, email: true, name: true, role: true, passwordHash: true, organizationId: true },
        });
      } else if (!admin && meta.role === "org_admin" && orgId) {
        admin = await prisma.adminUser.findFirst({
          where: { role: "org_admin", organizationId: orgId },
          orderBy: { createdAt: "asc" },
          select: { id: true, email: true, name: true, role: true, passwordHash: true, organizationId: true },
        });
      }
      views.push({
        key,
        label: meta.label,
        kind: "admin",
        role: meta.role ?? null,
        orgSlug: meta.orgSlug,
        orgName,
        loginPath: meta.loginPath,
        email: admin?.email ?? stored.email,
        name: admin?.name?.trim() || stored.name,
        userId: admin?.id ?? null,
        exists: Boolean(admin),
        hasPassword: Boolean(admin?.passwordHash),
      });
      continue;
    }

    const student = orgId
      ? await prisma.student.findFirst({
          where: { organizationId: orgId, email: stored.email },
          select: { id: true, name: true, email: true, portalPasswordHash: true },
        })
      : null;
    views.push({
      key,
      label: meta.label,
      kind: "student",
      role: null,
      orgSlug: meta.orgSlug,
      orgName,
      loginPath: meta.loginPath,
      email: student?.email?.trim() || stored.email,
      name: student?.name?.trim() || stored.name,
      userId: student?.id ?? null,
      exists: Boolean(student),
      hasPassword: Boolean(student?.portalPasswordHash),
      portalSignInEnabled: Boolean(student?.portalPasswordHash),
    });
  }

  return views;
}

export type ApplyDemoLoginsResult =
  | { ok: true; slots: DemoLoginView[]; updated: DemoLoginSlotKey[]; messages: string[] }
  | { ok: false; error: string; status: number };

export async function applyDemoLoginPatches(
  patches: DemoLoginPatch[],
  opts?: { updatedBy?: string },
): Promise<ApplyDemoLoginsResult> {
  if (!patches.length) return { ok: false, error: "No demo login updates", status: 400 };

  const updatedBy = opts?.updatedBy?.trim() || "master";
  const directory = await loadDemoLoginDirectory();
  const updated: DemoLoginSlotKey[] = [];
  const messages: string[] = [];

  for (const patch of patches) {
    const meta = DEMO_LOGIN_SLOT_META[patch.key];
    if (!meta) return { ok: false, error: `Unknown slot: ${patch.key}`, status: 400 };

    const nextEmail =
      patch.email !== undefined ? normalizeEmail(patch.email) : directory[patch.key].email;
    const nextName =
      patch.name !== undefined ? patch.name.trim() : directory[patch.key].name;
    const password = patch.password?.trim() ?? "";

    if (!nextEmail || !nextEmail.includes("@")) {
      return { ok: false, error: `${meta.label}: valid email required`, status: 400 };
    }
    if (!nextName) {
      return { ok: false, error: `${meta.label}: name required`, status: 400 };
    }
    if (password && password.length < 10) {
      return { ok: false, error: `${meta.label}: password must be at least 10 characters`, status: 400 };
    }

    let orgId: string | null = null;
    if (meta.orgSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: meta.orgSlug },
        select: { id: true },
      });
      if (!org) {
        return {
          ok: false,
          error: `${meta.label}: organization "${meta.orgSlug}" not found — run npm run seed first`,
          status: 404,
        };
      }
      orgId = org.id;
    }

    if (meta.kind === "admin") {
      let admin =
        (await prisma.adminUser.findUnique({ where: { email: directory[patch.key].email } })) ??
        (meta.role === "master"
          ? await prisma.adminUser.findFirst({ where: { role: "master" }, orderBy: { createdAt: "asc" } })
          : orgId
            ? await prisma.adminUser.findFirst({
                where: { role: "org_admin", organizationId: orgId },
                orderBy: { createdAt: "asc" },
              })
            : null);

      if (!admin && patch.provisionIfMissing !== false) {
        if (!password) {
          return {
            ok: false,
            error: `${meta.label}: account missing — provide a password to provision`,
            status: 400,
          };
        }
        const clash = await prisma.adminUser.findUnique({ where: { email: nextEmail } });
        if (clash) {
          return { ok: false, error: `${meta.label}: email ${nextEmail} already in use`, status: 409 };
        }
        const passwordHash = await bcrypt.hash(password, 10);
        admin = await prisma.adminUser.create({
          data: {
            email: nextEmail,
            name: nextName,
            role: meta.role ?? "org_admin",
            organizationId: meta.role === "master" ? null : orgId,
            passwordHash,
          },
        });
        messages.push(`${meta.label}: provisioned`);
      } else if (!admin) {
        return { ok: false, error: `${meta.label}: account not found`, status: 404 };
      } else {
        if (nextEmail !== admin.email) {
          const clash = await prisma.adminUser.findUnique({ where: { email: nextEmail } });
          if (clash && clash.id !== admin.id) {
            return { ok: false, error: `${meta.label}: email ${nextEmail} already in use`, status: 409 };
          }
        }
        const data: { email?: string; name?: string; passwordHash?: string } = {};
        if (nextEmail !== admin.email) data.email = nextEmail;
        if (nextName !== admin.name) data.name = nextName;
        if (password) data.passwordHash = await bcrypt.hash(password, 10);
        if (Object.keys(data).length) {
          await prisma.adminUser.update({ where: { id: admin.id }, data });
          messages.push(`${meta.label}: updated`);
        } else {
          messages.push(`${meta.label}: unchanged`);
        }
      }
    } else {
      let student = await prisma.student.findFirst({
        where: { organizationId: orgId!, email: directory[patch.key].email },
      });
      if (!student) {
        student = await prisma.student.findFirst({
          where: { organizationId: orgId!, email: nextEmail },
        });
      }
      if (!student && patch.provisionIfMissing !== false) {
        if (!password) {
          return {
            ok: false,
            error: `${meta.label}: account missing — provide a password to provision`,
            status: 400,
          };
        }
        const portalPasswordHash = await bcrypt.hash(password, 10);
        student = await prisma.student.create({
          data: {
            organizationId: orgId!,
            name: nextName,
            email: nextEmail,
            programmeCode: meta.orgSlug === "riverside-demo" ? "P7-STREAM" : "BEP-ENG/RE",
            year: 1,
            semester: 1,
            portalPasswordHash,
          },
        });
        messages.push(`${meta.label}: provisioned`);
      } else if (!student) {
        return { ok: false, error: `${meta.label}: account not found`, status: 404 };
      } else {
        const data: { email?: string; name?: string; portalPasswordHash?: string } = {};
        if (nextEmail !== student.email) data.email = nextEmail;
        if (nextName !== student.name) data.name = nextName;
        if (password) data.portalPasswordHash = await bcrypt.hash(password, 10);
        if (Object.keys(data).length) {
          await prisma.student.update({ where: { id: student.id }, data });
          messages.push(`${meta.label}: updated`);
        } else {
          messages.push(`${meta.label}: unchanged`);
        }
      }
    }

    directory[patch.key] = { email: nextEmail, name: nextName };
    updated.push(patch.key);

    if (meta.seedEmailEnv) {
      await upsertSeedEnv(meta.seedEmailEnv, nextEmail, updatedBy);
    }
    if (meta.seedPasswordEnv && password) {
      await upsertSeedEnv(meta.seedPasswordEnv, password, updatedBy);
    }
  }

  await saveDemoLoginDirectory(directory);
  const slots = await listDemoLoginsForMaster();
  return { ok: true, slots, updated, messages };
}

export async function peekSeedEnvOverride(name: string): Promise<string | null> {
  const row = await prisma.deploymentEnvOverride.findUnique({ where: { name } });
  if (!row) return null;
  try {
    return decryptDeploymentEnvValue(row.valueEnc);
  } catch {
    return null;
  }
}

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
  csvEscape,
  defaultDemoLoginDirectory,
  resolveDemoLoginMeta,
  type DemoLoginAudience,
  type DemoLoginDirectory,
  type DemoLoginPublicView,
  type DemoLoginSlotKey,
  type DemoLoginStored,
} from "@/lib/demo-logins-shared";

export {
  DEMO_LOGIN_SLOT_KEYS,
  DEMO_LOGIN_SLOT_META,
  csvEscape,
  defaultDemoLoginDirectory,
  resolveDemoLoginMeta,
  type DemoLoginAudience,
  type DemoLoginDirectory,
  type DemoLoginPublicView,
  type DemoLoginSlotKey,
  type DemoLoginStored,
} from "@/lib/demo-logins-shared";

export type DemoLoginView = {
  key: DemoLoginSlotKey;
  label: string;
  kind: "admin" | "student";
  role: "master" | "org_admin" | null;
  audience: DemoLoginAudience;
  orgSlug: string | null;
  orgName: string | null;
  loginPath: string;
  email: string;
  name: string;
  userId: string | null;
  exists: boolean;
  hasPassword: boolean;
  publishPublic: boolean;
  publicPasswordHint: string;
  notes: string;
  portalSignInEnabled?: boolean;
};

export type DemoLoginPatch = {
  key: DemoLoginSlotKey;
  email?: string;
  name?: string;
  password?: string;
  label?: string;
  orgSlug?: string | null;
  loginPath?: string;
  publishPublic?: boolean;
  publicPasswordHint?: string;
  notes?: string;
  /** When true and password is set, also store it as publicPasswordHint. */
  publishPasswordAsHint?: boolean;
  provisionIfMissing?: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isDirectory(value: unknown): value is DemoLoginDirectory {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseStoredEntry(raw: unknown, fallback: DemoLoginStored): DemoLoginStored {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...fallback };
  const entry = raw as Record<string, unknown>;
  const email =
    typeof entry.email === "string" && entry.email.trim()
      ? normalizeEmail(entry.email)
      : fallback.email;
  const name =
    typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : fallback.name;
  const next: DemoLoginStored = { email, name };
  if (typeof entry.label === "string") next.label = entry.label.trim() || undefined;
  if (entry.orgSlug === null) next.orgSlug = null;
  else if (typeof entry.orgSlug === "string") next.orgSlug = entry.orgSlug.trim() || null;
  if (typeof entry.loginPath === "string") next.loginPath = entry.loginPath.trim() || undefined;
  if (typeof entry.publishPublic === "boolean") next.publishPublic = entry.publishPublic;
  else if (typeof fallback.publishPublic === "boolean") next.publishPublic = fallback.publishPublic;
  if (typeof entry.publicPasswordHint === "string") {
    next.publicPasswordHint = entry.publicPasswordHint;
  }
  if (typeof entry.notes === "string") next.notes = entry.notes;
  return next;
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
    merged[key] = parseStoredEntry(stored[key], defaults[key]);
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

export async function peekSeedEnvOverride(name: string): Promise<string | null> {
  const row = await prisma.deploymentEnvOverride.findUnique({ where: { name } });
  if (!row) return null;
  try {
    return decryptDeploymentEnvValue(row.valueEnc);
  } catch {
    return null;
  }
}

export async function listDemoLoginsForMaster(): Promise<DemoLoginView[]> {
  const directory = await loadDemoLoginDirectory();
  const views: DemoLoginView[] = [];

  for (const key of DEMO_LOGIN_SLOT_KEYS) {
    const stored = directory[key];
    const { meta, label, orgSlug, loginPath, publishPublic } = resolveDemoLoginMeta(key, stored);
    let orgName: string | null = null;
    let orgId: string | null = null;
    if (orgSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: orgSlug },
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
        label,
        kind: "admin",
        role: meta.role ?? null,
        audience: meta.audience,
        orgSlug,
        orgName,
        loginPath,
        email: admin?.email ?? stored.email,
        name: admin?.name?.trim() || stored.name,
        userId: admin?.id ?? null,
        exists: Boolean(admin),
        hasPassword: Boolean(admin?.passwordHash),
        publishPublic,
        publicPasswordHint: stored.publicPasswordHint?.trim() || "",
        notes: stored.notes?.trim() || "",
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
      label,
      kind: "student",
      role: null,
      audience: meta.audience,
      orgSlug,
      orgName,
      loginPath,
      email: student?.email?.trim() || stored.email,
      name: student?.name?.trim() || stored.name,
      userId: student?.id ?? null,
      exists: Boolean(student),
      hasPassword: Boolean(student?.portalPasswordHash),
      publishPublic,
      publicPasswordHint: stored.publicPasswordHint?.trim() || "",
      notes: stored.notes?.trim() || "",
      portalSignInEnabled: Boolean(student?.portalPasswordHash),
    });
  }

  return views;
}

export async function listPublicDemoLogins(opts?: {
  audience?: DemoLoginAudience | "all";
}): Promise<DemoLoginPublicView[]> {
  const audience = opts?.audience ?? "all";
  const views = await listDemoLoginsForMaster();
  return views
    .filter((v) => v.publishPublic)
    .filter((v) => audience === "all" || v.audience === audience)
    .map((v) => ({
      key: v.key,
      label: v.label,
      kind: v.kind,
      audience: v.audience,
      orgSlug: v.orgSlug,
      orgName: v.orgName,
      loginPath: v.loginPath,
      email: v.email,
      name: v.name,
      passwordHint: v.publicPasswordHint.trim() ? v.publicPasswordHint.trim() : null,
      notes: v.notes.trim() ? v.notes.trim() : null,
    }));
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

    const prev = directory[patch.key];
    const nextEmail =
      patch.email !== undefined ? normalizeEmail(patch.email) : prev.email;
    const nextName = patch.name !== undefined ? patch.name.trim() : prev.name;
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

    const nextStored: DemoLoginStored = {
      email: nextEmail,
      name: nextName,
      label: patch.label !== undefined ? patch.label.trim() || undefined : prev.label,
      orgSlug:
        patch.orgSlug !== undefined
          ? patch.orgSlug === null || patch.orgSlug === ""
            ? null
            : patch.orgSlug.trim()
          : prev.orgSlug,
      loginPath:
        patch.loginPath !== undefined ? patch.loginPath.trim() || undefined : prev.loginPath,
      publishPublic:
        patch.publishPublic !== undefined ? patch.publishPublic : prev.publishPublic,
      publicPasswordHint:
        patch.publicPasswordHint !== undefined
          ? patch.publicPasswordHint
          : prev.publicPasswordHint,
      notes: patch.notes !== undefined ? patch.notes : prev.notes,
    };

    if (password && patch.publishPasswordAsHint) {
      nextStored.publicPasswordHint = password;
    }

    const resolved = resolveDemoLoginMeta(patch.key, nextStored);
    let orgId: string | null = null;
    if (resolved.orgSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: resolved.orgSlug },
        select: { id: true },
      });
      if (!org) {
        return {
          ok: false,
          error: `${resolved.label}: organization "${resolved.orgSlug}" not found — run npm run seed or pick an existing slug`,
          status: 404,
        };
      }
      orgId = org.id;
    }

    if (meta.kind === "admin") {
      let admin =
        (await prisma.adminUser.findUnique({ where: { email: prev.email } })) ??
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
            error: `${resolved.label}: account missing — provide a password to provision`,
            status: 400,
          };
        }
        const clash = await prisma.adminUser.findUnique({ where: { email: nextEmail } });
        if (clash) {
          return { ok: false, error: `${resolved.label}: email ${nextEmail} already in use`, status: 409 };
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
        messages.push(`${resolved.label}: provisioned`);
      } else if (!admin) {
        return { ok: false, error: `${resolved.label}: account not found`, status: 404 };
      } else {
        if (nextEmail !== admin.email) {
          const clash = await prisma.adminUser.findUnique({ where: { email: nextEmail } });
          if (clash && clash.id !== admin.id) {
            return { ok: false, error: `${resolved.label}: email ${nextEmail} already in use`, status: 409 };
          }
        }
        const data: { email?: string; name?: string; passwordHash?: string } = {};
        if (nextEmail !== admin.email) data.email = nextEmail;
        if (nextName !== admin.name) data.name = nextName;
        if (password) data.passwordHash = await bcrypt.hash(password, 10);
        if (Object.keys(data).length) {
          await prisma.adminUser.update({ where: { id: admin.id }, data });
          messages.push(`${resolved.label}: updated`);
        } else {
          messages.push(`${resolved.label}: directory saved`);
        }
      }
    } else {
      let student = await prisma.student.findFirst({
        where: { organizationId: orgId!, email: prev.email },
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
            error: `${resolved.label}: account missing — provide a password to provision`,
            status: 400,
          };
        }
        const portalPasswordHash = await bcrypt.hash(password, 10);
        student = await prisma.student.create({
          data: {
            organizationId: orgId!,
            name: nextName,
            email: nextEmail,
            programmeCode: resolved.orgSlug === "riverside-demo" ? "P7-STREAM" : "BEP-ENG/RE",
            year: 1,
            semester: 1,
            portalPasswordHash,
          },
        });
        messages.push(`${resolved.label}: provisioned`);
      } else if (!student) {
        return { ok: false, error: `${resolved.label}: account not found`, status: 404 };
      } else {
        const data: { email?: string; name?: string; portalPasswordHash?: string } = {};
        if (nextEmail !== student.email) data.email = nextEmail;
        if (nextName !== student.name) data.name = nextName;
        if (password) data.portalPasswordHash = await bcrypt.hash(password, 10);
        if (Object.keys(data).length) {
          await prisma.student.update({ where: { id: student.id }, data });
          messages.push(`${resolved.label}: updated`);
        } else {
          messages.push(`${resolved.label}: directory saved`);
        }
      }
    }

    directory[patch.key] = nextStored;
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

export type DemoLoginsExportFormat = "json" | "csv" | "md";

export async function buildDemoLoginsExport(format: DemoLoginsExportFormat): Promise<{
  filename: string;
  contentType: string;
  body: string;
}> {
  const slots = await listDemoLoginsForMaster();
  const stamp = new Date().toISOString().slice(0, 10);
  const rows = await Promise.all(
    slots.map(async (s) => {
      const meta = DEMO_LOGIN_SLOT_META[s.key];
      let seedPassword: string | null = null;
      if (meta.seedPasswordEnv) {
        seedPassword = await peekSeedEnvOverride(meta.seedPasswordEnv);
      }
      const passwordForSheet =
        s.publicPasswordHint.trim() || seedPassword || (s.hasPassword ? "(set — not stored in plaintext)" : "(not set)");
      return {
        key: s.key,
        label: s.label,
        audience: s.audience,
        kind: s.kind,
        role: s.role,
        orgSlug: s.orgSlug,
        orgName: s.orgName,
        loginPath: s.loginPath,
        email: s.email,
        name: s.name,
        exists: s.exists,
        hasPassword: s.hasPassword,
        publishPublic: s.publishPublic,
        publicPasswordHint: s.publicPasswordHint,
        password: passwordForSheet,
        notes: s.notes,
      };
    }),
  );

  if (format === "json") {
    return {
      filename: `odelhub-demo-logins-${stamp}.json`,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          source: "Master Admin Console — Demo logins",
          note: "Password column uses public hint when set, else last SEED_* deployment-env override. Hashes are never exported.",
          slots: rows,
        },
        null,
        2,
      ),
    };
  }

  if (format === "csv") {
    const headers = [
      "key",
      "label",
      "audience",
      "kind",
      "orgSlug",
      "orgName",
      "loginPath",
      "email",
      "name",
      "password",
      "publishPublic",
      "notes",
    ];
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.key,
          r.label,
          r.audience,
          r.kind,
          r.orgSlug ?? "",
          r.orgName ?? "",
          r.loginPath,
          r.email,
          r.name,
          r.password,
          String(r.publishPublic),
          r.notes,
        ]
          .map((c) => csvEscape(String(c)))
          .join(","),
      ),
    ];
    return {
      filename: `odelhub-demo-logins-${stamp}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: lines.join("\n"),
    };
  }

  const md = [
    `# ODEL HUB — Demo login details`,
    ``,
    `Exported: ${new Date().toISOString()}`,
    ``,
    `Source: Master Admin Console (\`/admin/master#demo-logins\`).`,
    `Public lobbies auto-update from the same directory when **Publish on lobbies** is enabled.`,
    ``,
    ...rows.flatMap((r) => [
      `## ${r.label}`,
      ``,
      `- **Slot:** \`${r.key}\` (${r.audience} · ${r.kind})`,
      `- **Org:** ${r.orgName ? `${r.orgName} (\`${r.orgSlug}\`)` : r.orgSlug ? `\`${r.orgSlug}\`` : "—"}`,
      `- **Login:** ${r.loginPath}`,
      `- **Name:** ${r.name}`,
      `- **Email:** \`${r.email}\``,
      `- **Password:** \`${r.password}\``,
      `- **Published publicly:** ${r.publishPublic ? "yes" : "no"}`,
      r.notes ? `- **Notes:** ${r.notes}` : null,
      ``,
    ]).filter((line): line is string => line !== null),
  ].join("\n");

  return {
    filename: `odelhub-demo-logins-${stamp}.md`,
    contentType: "text/markdown; charset=utf-8",
    body: md,
  };
}

import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deserializeRows } from "@/lib/backup/deserialize";
import {
  countCollections,
  parseTuitionBackupSnapshot,
  type ParsedSnapshot,
  type SnapshotValidationIssue,
  type TuitionBackupCollection,
} from "@/lib/backup/parse-snapshot";

export type RestoreMode = "dryRun" | "replaceTuition" | "mergeUpsert";

export type RestoreReport = {
  mode: RestoreMode;
  dryRun: boolean;
  exportedAt: string | null;
  backupVersion: number | null;
  counts: Record<string, number>;
  issues: SnapshotValidationIssue[];
  inserted: Partial<Record<TuitionBackupCollection, number>>;
  skipped: Partial<Record<TuitionBackupCollection, number>>;
  warnings: string[];
};

const TX_OPTS = { maxWait: 30_000, timeout: 120_000 } as const;

function stripRow<T extends Record<string, unknown>>(row: T, omit: string[]): Record<string, unknown> {
  const out = { ...row };
  for (const k of omit) delete out[k];
  return out;
}

function orgIds(snapshot: ParsedSnapshot): Set<string> {
  return new Set(
    deserializeRows<Record<string, unknown>>(snapshot.collections.organizations).map((r) => String(r.id)),
  );
}

function programmeIds(snapshot: ParsedSnapshot): Set<string> {
  return new Set(
    deserializeRows<Record<string, unknown>>(snapshot.collections.programmes).map((r) => String(r.id)),
  );
}

function validateReferentialIntegrity(snapshot: ParsedSnapshot): SnapshotValidationIssue[] {
  const issues: SnapshotValidationIssue[] = [];
  const oids = orgIds(snapshot);
  const pids = programmeIds(snapshot);

  const checkOrg = (collection: TuitionBackupCollection, field = "organizationId") => {
    for (const raw of snapshot.collections[collection]) {
      const row = raw as Record<string, unknown>;
      const oid = row[field];
      if (oid != null && oid !== "" && !oids.has(String(oid))) {
        issues.push({
          level: "error",
          code: "orphan_org",
          message: `${collection} row ${row.id} references missing organization ${oid}`,
        });
      }
    }
  };

  checkOrg("programmes");
  checkOrg("students");
  checkOrg("payments");
  checkOrg("fxRates");
  checkOrg("partnerApiKeys");
  checkOrg("partnerWebhookEndpoints");
  checkOrg("mobileMoneyProviders");

  for (const raw of snapshot.collections.programmeFees) {
    const row = raw as Record<string, unknown>;
    if (!pids.has(String(row.programmeId))) {
      issues.push({
        level: "error",
        code: "orphan_programme",
        message: `programmeFees row ${row.id} references missing programme ${row.programmeId}`,
      });
    }
  }

  const studentIds = new Set(
    deserializeRows<Record<string, unknown>>(snapshot.collections.students).map((r) => String(r.id)),
  );
  for (const raw of snapshot.collections.payments) {
    const row = raw as Record<string, unknown>;
    if (!studentIds.has(String(row.studentId))) {
      issues.push({
        level: "error",
        code: "orphan_student",
        message: `payments row ${row.id} references missing student ${row.studentId}`,
      });
    }
  }

  return issues;
}

async function countExistingTuition(): Promise<Record<string, number>> {
  const [
    organizations,
    programmes,
    programmeFees,
    students,
    payments,
    fxRates,
    siteUiSettings,
    adminUsers,
    processedWebhooks,
    studentSignupTokens,
    partnerApiKeys,
    partnerWebhookEndpoints,
    mobileMoneyProviders,
    partnerWebhookDeliveries,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.programme.count(),
    prisma.programmeFee.count(),
    prisma.student.count(),
    prisma.payment.count(),
    prisma.fxRate.count(),
    prisma.siteUiSettings.count(),
    prisma.adminUser.count(),
    prisma.processedWebhook.count(),
    prisma.studentSignupToken.count(),
    prisma.partnerApiKey.count(),
    prisma.partnerWebhookEndpoint.count(),
    prisma.mobileMoneyProvider.count(),
    prisma.partnerWebhookDelivery.count(),
  ]);

  return {
    organizations,
    programmes,
    programmeFees,
    students,
    payments,
    fxRates,
    siteUiSettings,
    adminUsers,
    processedWebhooks,
    studentSignupTokens,
    partnerApiKeys,
    partnerWebhookEndpoints,
    mobileMoneyProviders,
    partnerWebhookDeliveries,
  };
}

async function clearTuitionCollections(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.partnerWebhookDelivery.deleteMany({});
    await tx.payment.deleteMany({});
    await tx.student.deleteMany({});
    await tx.programmeFee.deleteMany({});
    await tx.programme.deleteMany({});
    await tx.fxRate.deleteMany({});
    await tx.partnerApiKey.deleteMany({});
    await tx.partnerWebhookEndpoint.deleteMany({});
    await tx.mobileMoneyProvider.deleteMany({});
    await tx.adminUser.deleteMany({});
    await tx.processedWebhook.deleteMany({});
    await tx.studentSignupToken.deleteMany({});
    await tx.organization.deleteMany({});
    await tx.siteUiSettings.deleteMany({});
  }, TX_OPTS);
}

async function insertCollection(
  tx: Prisma.TransactionClient,
  collection: TuitionBackupCollection,
  rows: Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const omitMeta = ["_exportNote"];

  switch (collection) {
    case "organizations": {
      for (const row of rows) {
        await tx.organization.create({ data: stripRow(row, omitMeta) as Prisma.OrganizationCreateInput });
      }
      return rows.length;
    }
    case "programmes": {
      for (const row of rows) {
        await tx.programme.create({ data: stripRow(row, omitMeta) as Prisma.ProgrammeCreateInput });
      }
      return rows.length;
    }
    case "programmeFees": {
      for (const row of rows) {
        await tx.programmeFee.create({ data: stripRow(row, omitMeta) as Prisma.ProgrammeFeeCreateInput });
      }
      return rows.length;
    }
    case "students": {
      for (const row of rows) {
        await tx.student.create({ data: stripRow(row, omitMeta) as Prisma.StudentCreateInput });
      }
      return rows.length;
    }
    case "payments": {
      for (const row of rows) {
        await tx.payment.create({ data: stripRow(row, omitMeta) as Prisma.PaymentCreateInput });
      }
      return rows.length;
    }
    case "fxRates": {
      for (const row of rows) {
        await tx.fxRate.create({ data: stripRow(row, omitMeta) as Prisma.FxRateCreateInput });
      }
      return rows.length;
    }
    case "siteUiSettings": {
      for (const row of rows) {
        await tx.siteUiSettings.create({ data: stripRow(row, omitMeta) as Prisma.SiteUiSettingsCreateInput });
      }
      return rows.length;
    }
    case "adminUsers": {
      let n = 0;
      for (const row of rows) {
        const email = String(row.email ?? "").trim().toLowerCase();
        const passwordHash = String(row.passwordHash ?? "").trim();
        if (!email || !passwordHash) continue;
        await tx.adminUser.create({
          data: stripRow(row, omitMeta) as Prisma.AdminUserCreateInput,
        });
        n++;
      }
      return n;
    }
    case "processedWebhooks": {
      for (const row of rows) {
        await tx.processedWebhook.create({ data: stripRow(row, omitMeta) as Prisma.ProcessedWebhookCreateInput });
      }
      return rows.length;
    }
    case "studentSignupTokens": {
      let n = 0;
      for (const row of rows) {
        if (!row.tokenHash || !row.passwordHash) continue;
        await tx.studentSignupToken.create({
          data: stripRow(row, omitMeta) as Prisma.StudentSignupTokenCreateInput,
        });
        n++;
      }
      return n;
    }
    case "partnerApiKeys": {
      let n = 0;
      for (const row of rows) {
        if (!row.keyHash || String(row.keyHash).length < 8) continue;
        await tx.partnerApiKey.create({ data: stripRow(row, omitMeta) as Prisma.PartnerApiKeyCreateInput });
        n++;
      }
      return n;
    }
    case "partnerWebhookEndpoints": {
      let n = 0;
      for (const row of rows) {
        const secret = String(row.secret ?? "").trim();
        if (!secret) continue;
        await tx.partnerWebhookEndpoint.create({
          data: stripRow(row, omitMeta) as Prisma.PartnerWebhookEndpointCreateInput,
        });
        n++;
      }
      return n;
    }
    case "mobileMoneyProviders": {
      let n = 0;
      for (const row of rows) {
        const secret = String(row.webhookSecret ?? "").trim();
        if (!secret) continue;
        await tx.mobileMoneyProvider.create({
          data: stripRow(row, omitMeta) as Prisma.MobileMoneyProviderCreateInput,
        });
        n++;
      }
      return n;
    }
    case "partnerWebhookDeliveries": {
      for (const row of rows) {
        await tx.partnerWebhookDelivery.create({
          data: stripRow(row, omitMeta) as Prisma.PartnerWebhookDeliveryCreateInput,
        });
      }
      return rows.length;
    }
    default:
      return 0;
  }
}

async function buildOrganizationIdMap(
  rows: Record<string, unknown>[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const oldId = String(row.id ?? "");
    const slug = String(row.slug ?? "").trim().toLowerCase();
    if (!oldId || !slug) continue;

    const data = stripRow(row, ["_exportNote"]) as Prisma.OrganizationCreateInput;
    const existing = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      await prisma.organization.update({
        where: { slug },
        data: stripRow(row, ["_exportNote", "id", "slug"]) as Prisma.OrganizationUpdateInput,
      });
      map.set(oldId, existing.id);
    } else {
      const created = await prisma.organization.create({
        data: { ...data, slug, ...(oldId ? { id: oldId } : {}) },
      });
      map.set(oldId, created.id);
    }
  }
  return map;
}

function remapOrgId(map: Map<string, string>, organizationId: unknown): string | null {
  if (organizationId == null || organizationId === "") return null;
  const key = String(organizationId);
  return map.get(key) ?? key;
}

async function mergeCollection(snapshot: ParsedSnapshot): Promise<{
  inserted: Partial<Record<TuitionBackupCollection, number>>;
  skipped: Partial<Record<TuitionBackupCollection, number>>;
  warnings: string[];
}> {
  const warnings: string[] = [
    "mergeUpsert: organizations matched by slug; students/payments upserted by id with organizationId remapped.",
    "Partner secrets and admin password hashes from redacted backups are skipped — reconfigure after restore.",
  ];
  const inserted: Partial<Record<TuitionBackupCollection, number>> = {};
  const skipped: Partial<Record<TuitionBackupCollection, number>> = {};

  const orgRows = deserializeRows<Record<string, unknown>>(snapshot.collections.organizations);
  const orgMap = await buildOrganizationIdMap(orgRows);
  inserted.organizations = orgMap.size;

  const progRows = deserializeRows<Record<string, unknown>>(snapshot.collections.programmes);
  let progN = 0;
  let progSkip = 0;
  for (const row of progRows) {
    const organizationId = remapOrgId(orgMap, row.organizationId);
    const code = String(row.code ?? "").trim().toUpperCase();
    if (!organizationId || !code) {
      progSkip++;
      continue;
    }
    await prisma.programme.upsert({
      where: { organizationId_code: { organizationId, code } },
      create: {
        ...(stripRow(row, ["_exportNote", "organization"]) as Prisma.ProgrammeUncheckedCreateInput),
        organizationId,
        code,
      },
      update: stripRow(row, ["_exportNote", "id", "organizationId", "code"]) as Prisma.ProgrammeUpdateInput,
    });
    progN++;
  }
  inserted.programmes = progN;
  skipped.programmes = progSkip;

  const upsertRows = async (
    collection: TuitionBackupCollection,
    write: (id: string, data: Record<string, unknown>) => Promise<void>,
    remap?: (row: Record<string, unknown>) => Record<string, unknown> | null,
  ) => {
    const rows = deserializeRows<Record<string, unknown>>(snapshot.collections[collection]);
    let count = 0;
    let skip = 0;
    for (const row of rows) {
      const id = String(row.id ?? "");
      if (!id) {
        skip++;
        continue;
      }
      const payload = remap ? remap(row) : stripRow(row, ["_exportNote"]);
      if (!payload) {
        skip++;
        continue;
      }
      try {
        await write(id, payload as Record<string, unknown>);
        count++;
      } catch {
        skip++;
      }
    }
    inserted[collection] = count;
    skipped[collection] = skip;
  };

  await upsertRows("programmeFees", async (id, data) => {
    await prisma.programmeFee.upsert({
      where: { id },
      create: data as Prisma.ProgrammeFeeCreateInput,
      update: data as Prisma.ProgrammeFeeUpdateInput,
    });
  });

  const withOrg = (row: Record<string, unknown>) => {
    const data = stripRow(row, ["_exportNote"]) as Record<string, unknown>;
    const organizationId = remapOrgId(orgMap, data.organizationId);
    if (!organizationId) return null;
    return { ...data, organizationId };
  };

  await upsertRows(
    "students",
    async (id, data) => {
      await prisma.student.upsert({
        where: { id },
        create: data as Prisma.StudentCreateInput,
        update: data as Prisma.StudentUpdateInput,
      });
    },
    withOrg,
  );
  await upsertRows(
    "payments",
    async (id, data) => {
      await prisma.payment.upsert({
        where: { id },
        create: data as Prisma.PaymentCreateInput,
        update: data as Prisma.PaymentUpdateInput,
      });
    },
    withOrg,
  );
  await upsertRows(
    "fxRates",
    async (id, data) => {
      await prisma.fxRate.upsert({
        where: { id },
        create: data as Prisma.FxRateCreateInput,
        update: data as Prisma.FxRateUpdateInput,
      });
    },
    withOrg,
  );
  await upsertRows("siteUiSettings", async (id, data) => {
    await prisma.siteUiSettings.upsert({
      where: { id },
      create: data as Prisma.SiteUiSettingsCreateInput,
      update: data as Prisma.SiteUiSettingsUpdateInput,
    });
  });
  await upsertRows("processedWebhooks", async (id, data) => {
    await prisma.processedWebhook.upsert({
      where: { id },
      create: data as Prisma.ProcessedWebhookCreateInput,
      update: data as Prisma.ProcessedWebhookUpdateInput,
    });
  });

  skipped.partnerApiKeys = snapshot.collections.partnerApiKeys.length;
  skipped.partnerWebhookEndpoints = snapshot.collections.partnerWebhookEndpoints.length;
  skipped.mobileMoneyProviders = snapshot.collections.mobileMoneyProviders.length;
  skipped.adminUsers = snapshot.collections.adminUsers.length;
  skipped.studentSignupTokens = snapshot.collections.studentSignupTokens.length;

  return { inserted, skipped, warnings };
}

const INSERT_ORDER: TuitionBackupCollection[] = [
  "organizations",
  "siteUiSettings",
  "programmes",
  "programmeFees",
  "students",
  "payments",
  "fxRates",
  "adminUsers",
  "processedWebhooks",
  "studentSignupTokens",
  "partnerApiKeys",
  "partnerWebhookEndpoints",
  "mobileMoneyProviders",
  "partnerWebhookDeliveries",
];

export async function restoreTuitionBackup(opts: {
  raw: unknown;
  mode: RestoreMode;
}): Promise<RestoreReport> {
  const parsed = parseTuitionBackupSnapshot(opts.raw);
  if (!parsed.ok) {
    return {
      mode: opts.mode,
      dryRun: true,
      exportedAt: null,
      backupVersion: null,
      counts: {},
      issues: parsed.issues,
      inserted: {},
      skipped: {},
      warnings: [],
    };
  }

  const snapshot = parsed.snapshot;
  const refIssues = validateReferentialIntegrity(snapshot);
  const issues = [...refIssues];
  const counts = countCollections(snapshot.collections);
  const warnings: string[] = [];
  const inserted: Partial<Record<TuitionBackupCollection, number>> = {};
  const skipped: Partial<Record<TuitionBackupCollection, number>> = {};

  if (issues.some((i) => i.level === "error")) {
    return {
      mode: opts.mode,
      dryRun: true,
      exportedAt: snapshot.meta.exportedAt ?? null,
      backupVersion: Number(snapshot.meta.version ?? 1),
      counts,
      issues,
      inserted,
      skipped,
      warnings,
    };
  }

  const existing = await countExistingTuition();
  const hasData = Object.values(existing).some((n) => n > 0);

  if (opts.mode === "dryRun") {
    if (hasData) {
      warnings.push(
        `Target database has existing tuition data (${existing.payments ?? 0} payments). Use replaceTuition only on an empty DB or staging clone.`,
      );
    }
    if (!snapshot.collections.adminUsers.some((r) => (r as { passwordHash?: string }).passwordHash)) {
      warnings.push("No admin password hashes in backup — run npm run master:set-login after restore.");
    }
    return {
      mode: opts.mode,
      dryRun: true,
      exportedAt: snapshot.meta.exportedAt ?? null,
      backupVersion: Number(snapshot.meta.version ?? 1),
      counts,
      issues,
      inserted: counts,
      skipped: {},
      warnings,
    };
  }

  if (opts.mode === "replaceTuition") {
    if (hasData) {
      warnings.push("replaceTuition: clearing all tuition-scoped collections before insert.");
    }
    await clearTuitionCollections();

    await prisma.$transaction(async (tx) => {
      for (const key of INSERT_ORDER) {
        const rows = deserializeRows<Record<string, unknown>>(snapshot.collections[key]);
        inserted[key] = await insertCollection(tx, key, rows);
        if (key === "partnerApiKeys" || key === "partnerWebhookEndpoints" || key === "mobileMoneyProviders") {
          skipped[key] = rows.length - (inserted[key] ?? 0);
        }
        if (key === "adminUsers") {
          skipped[key] = rows.length - (inserted[key] ?? 0);
        }
      }
    }, TX_OPTS);

    warnings.push(
      "Restore complete. Re-issue admin passwords (npm run master:set-login), partner API keys, and PSP webhook secrets if they were redacted in the backup file.",
    );
  }

  if (opts.mode === "mergeUpsert") {
    const mergeResult = await mergeCollection(snapshot);
    Object.assign(inserted, mergeResult.inserted);
    Object.assign(skipped, mergeResult.skipped);
    warnings.push(...mergeResult.warnings);
  }

  return {
    mode: opts.mode,
    dryRun: false,
    exportedAt: snapshot.meta.exportedAt ?? null,
    backupVersion: Number(snapshot.meta.version ?? 1),
    counts,
    issues,
    inserted,
    skipped,
    warnings,
  };
}

export function parseBackupJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

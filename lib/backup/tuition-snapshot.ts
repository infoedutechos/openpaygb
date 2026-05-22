import "server-only";

import { prisma } from "@/lib/prisma";
import { serializeRecord } from "@/lib/backup/serialize";
import {
  redactMobileMoneyProviderRow,
  redactPartnerApiKeyRow,
  redactPartnerWebhookRow,
} from "@/lib/backup/redact";
import { countCollections, TUITION_BACKUP_COLLECTIONS, type TuitionBackupCollection } from "@/lib/backup/parse-snapshot";

export type BackupCollectionCounts = Record<string, number>;

export const BACKUP_VERSION = 2;

export type TuitionBackupSnapshot = {
  meta: {
    exportedAt: string;
    app: "ODELHUB Pay";
    version: number;
    scope: "tuition";
    note: string;
    counts: BackupCollectionCounts;
  };
  data: Record<string, unknown[]>;
};

function mapRows(rows: unknown[], mapper?: (r: Record<string, unknown>) => Record<string, unknown>) {
  return rows.map((r) => {
    const serialized = serializeRecord(r) as Record<string, unknown>;
    return mapper ? mapper(serialized) : serialized;
  });
}

/** Live point-in-time JSON export of tuition-critical collections (master disaster recovery). */
export async function buildTuitionBackupSnapshot(): Promise<TuitionBackupSnapshot> {
  const exportedAt = new Date().toISOString();

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
    prisma.organization.findMany(),
    prisma.programme.findMany(),
    prisma.programmeFee.findMany(),
    prisma.student.findMany(),
    prisma.payment.findMany(),
    prisma.fxRate.findMany(),
    prisma.siteUiSettings.findMany(),
    prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.processedWebhook.findMany(),
    prisma.studentSignupToken.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        expiresAt: true,
        verifiedAt: true,
        consumedAt: true,
        createdAt: true,
      },
    }),
    prisma.partnerApiKey.findMany(),
    prisma.partnerWebhookEndpoint.findMany(),
    prisma.mobileMoneyProvider.findMany(),
    prisma.partnerWebhookDelivery.findMany(),
  ]);

  const collections: Record<TuitionBackupCollection, unknown[]> = {
    organizations: mapRows(organizations),
    programmes: mapRows(programmes),
    programmeFees: mapRows(programmeFees),
    students: mapRows(students),
    payments: mapRows(payments),
    fxRates: mapRows(fxRates),
    siteUiSettings: mapRows(siteUiSettings),
    adminUsers: mapRows(adminUsers),
    processedWebhooks: mapRows(processedWebhooks),
    studentSignupTokens: mapRows(studentSignupTokens),
    partnerApiKeys: mapRows(partnerApiKeys, redactPartnerApiKeyRow),
    partnerWebhookEndpoints: mapRows(partnerWebhookEndpoints, redactPartnerWebhookRow),
    mobileMoneyProviders: mapRows(mobileMoneyProviders, redactMobileMoneyProviderRow),
    partnerWebhookDeliveries: mapRows(partnerWebhookDeliveries),
  };

  const counts = countCollections(collections);

  return {
    meta: {
      exportedAt,
      app: "ODELHUB Pay",
      version: BACKUP_VERSION,
      scope: "tuition",
      note:
        "Point-in-time export via Prisma. Admin password hashes, signup token hashes, partner API key hashes, webhook secrets, and PSP webhook secrets are omitted or redacted. Binary fields are base64-encoded. Re-issue admin passwords and integration secrets after restore.",
      counts,
    },
    data: collections,
  };
}

export async function getTuitionBackupCounts(): Promise<BackupCollectionCounts> {
  const counts = await Promise.all(
    TUITION_BACKUP_COLLECTIONS.map(async (key) => {
      switch (key) {
        case "organizations":
          return ["organizations", await prisma.organization.count()] as const;
        case "programmes":
          return ["programmes", await prisma.programme.count()] as const;
        case "programmeFees":
          return ["programmeFees", await prisma.programmeFee.count()] as const;
        case "students":
          return ["students", await prisma.student.count()] as const;
        case "payments":
          return ["payments", await prisma.payment.count()] as const;
        case "fxRates":
          return ["fxRates", await prisma.fxRate.count()] as const;
        case "siteUiSettings":
          return ["siteUiSettings", await prisma.siteUiSettings.count()] as const;
        case "adminUsers":
          return ["adminUsers", await prisma.adminUser.count()] as const;
        case "processedWebhooks":
          return ["processedWebhooks", await prisma.processedWebhook.count()] as const;
        case "studentSignupTokens":
          return ["studentSignupTokens", await prisma.studentSignupToken.count()] as const;
        case "partnerApiKeys":
          return ["partnerApiKeys", await prisma.partnerApiKey.count()] as const;
        case "partnerWebhookEndpoints":
          return ["partnerWebhookEndpoints", await prisma.partnerWebhookEndpoint.count()] as const;
        case "mobileMoneyProviders":
          return ["mobileMoneyProviders", await prisma.mobileMoneyProvider.count()] as const;
        case "partnerWebhookDeliveries":
          return ["partnerWebhookDeliveries", await prisma.partnerWebhookDelivery.count()] as const;
        default:
          return [key, 0] as const;
      }
    }),
  );

  return Object.fromEntries(counts);
}

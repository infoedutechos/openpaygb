import { prisma } from "@/lib/prisma";
import {
  DEVELOPER_DEFAULT_SCOPES,
  generateDeveloperCredentials,
  slugifyDeveloperAppName,
} from "@/lib/developer-app";

/**
 * Ensure the school org has a linked OpenPayGB merchant DeveloperApp.
 * Reuses the oldest enabled app for the org; creates one if missing.
 */
export async function ensureSchoolMerchantApp(organizationId: string) {
  const existing = await prisma.developerApp.findFirst({
    where: { organizationId, enabled: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return { app: existing, created: false as const };

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      letterheadEmail: true,
      registrationContactEmail: true,
    },
  });
  if (!org) throw new Error("Organization not found");

  const contactEmail =
    org.letterheadEmail?.trim() ||
    org.registrationContactEmail?.trim() ||
    `finance@${org.slug}.local`;
  const creds = generateDeveloperCredentials();
  const name = `${org.name} · OpenPayGB`;

  const app = await prisma.developerApp.create({
    data: {
      name,
      slug: slugifyDeveloperAppName(`${org.slug}-opgb`),
      contactEmail,
      clientId: creds.clientId,
      clientSecretHash: creds.clientSecretHash,
      redirectUris: ["http://localhost:3000/developers/dashboard"],
      brandingName: org.name,
      scopes: [...DEVELOPER_DEFAULT_SCOPES],
      organizationId: org.id,
      platformFeePayer: "pass_through",
      payoutNetwork: "MTN",
    },
  });

  return { app, created: true as const };
}

export async function getSchoolMerchantApp(organizationId: string) {
  return prisma.developerApp.findFirst({
    where: { organizationId, enabled: true },
    orderBy: { createdAt: "asc" },
  });
}

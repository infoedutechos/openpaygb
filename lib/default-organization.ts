import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";

const DEFAULT_SLUG = "default";

/**
 * Public flows (Telegram, MoMo collect) attach to the seeded tenant unless you pass an explicit org.
 */
export async function getDefaultOrganizationId(): Promise<string> {
  const org = await withPrismaRetry(() =>
    prisma.organization.findUnique({ where: { slug: DEFAULT_SLUG } }),
  );
  if (!org) {
    throw new Error(`Missing organization slug "${DEFAULT_SLUG}". Run: npm run seed`);
  }
  return org.id;
}

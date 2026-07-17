import "server-only";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";

/**
 * SchoolPay-style School Code — 6-digit numeric code per organization.
 * Parents use it (with the student's admission/registration number) to find the
 * school and start fee checkout, mirroring how SchoolPay codes work in Uganda.
 * Uniqueness is enforced app-side on generation (no Mongo unique index to avoid
 * conflicts with existing documents that lack the field).
 */

export function isValidSchoolPayCode(raw: string): boolean {
  return /^\d{6}$/.test(raw.trim());
}

function randomSchoolPayCode(): string {
  // 100000–999999 — never leading-zero so codes read naturally over the phone.
  return String(100_000 + Math.floor(Math.random() * 900_000));
}

/** Returns the org's School Code, generating and persisting one if missing. */
export async function ensureSchoolPayCode(organizationId: string): Promise<string> {
  const org = await withPrismaRetry(() =>
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { schoolPayCode: true },
    }),
  );
  const existing = org?.schoolPayCode?.trim() ?? "";
  if (isValidSchoolPayCode(existing)) return existing;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomSchoolPayCode();
    const clash = await prisma.organization.findFirst({
      where: { schoolPayCode: code },
      select: { id: true },
    });
    if (clash) continue;
    await prisma.organization.update({
      where: { id: organizationId },
      data: { schoolPayCode: code },
    });
    return code;
  }
  throw new Error("Could not allocate a unique School Code — retry");
}

export type SchoolCodeLookup = {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
};

/** Resolve an active organization by its School Code (public checkout entry). */
export async function findActiveOrganizationBySchoolPayCode(
  raw: string,
): Promise<SchoolCodeLookup | null> {
  const code = raw.trim();
  if (!isValidSchoolPayCode(code)) return null;
  const org = await withPrismaRetry(() =>
    prisma.organization.findFirst({
      where: { schoolPayCode: code, tenantStatus: "active" },
      select: { id: true, slug: true, name: true },
    }),
  );
  if (!org) return null;
  return { organizationId: org.id, organizationSlug: org.slug, organizationName: org.name };
}

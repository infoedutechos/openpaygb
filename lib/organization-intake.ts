import { z } from "zod";
import { OrganizationTenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const orgSlugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens");

export const pendingOrgBodySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(48),
  registrationContactEmail: z.string().email().optional().or(z.literal("")),
  registrationWebsiteUrl: z.string().max(2048).optional().default(""),
  registrationNote: z.string().max(2000).optional().default(""),
});

/** Self-service school registration — contact email required for verification mail. */
export const pendingOrgPublicBodySchema = pendingOrgBodySchema.extend({
  registrationContactEmail: z.string().email(),
});

export type PendingOrgInput = z.infer<typeof pendingOrgBodySchema>;

export function normalizeOrgSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeRegistrationContactEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Latest pending workspace for a contact email (exact match, then legacy mixed-case rows). */
export async function findPendingOrganizationByContactEmail(email: string) {
  const normalized = normalizeRegistrationContactEmail(email);
  if (!normalized) return null;

  const exact = await prisma.organization.findFirst({
    where: {
      registrationContactEmail: normalized,
      tenantStatus: OrganizationTenantStatus.pending,
    },
    orderBy: { createdAt: "desc" },
  });
  if (exact) return exact;

  const pendingWithEmail = await prisma.organization.findMany({
    where: {
      tenantStatus: OrganizationTenantStatus.pending,
      NOT: { registrationContactEmail: "" },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    pendingWithEmail.find(
      (o) => normalizeRegistrationContactEmail(o.registrationContactEmail) === normalized,
    ) ?? null
  );
}

/** Creates a **pending** workspace (school self-serve or master). */
export async function createPendingOrganization(input: PendingOrgInput) {
  const slugResult = orgSlugSchema.safeParse(normalizeOrgSlug(input.slug));
  if (!slugResult.success) {
    throw new Error(slugResult.error.errors[0]?.message ?? "Invalid slug");
  }
  const slug = slugResult.data;
  if (slug === "default") {
    throw new Error('Slug "default" is reserved for the template tenant');
  }

  try {
    return await prisma.organization.create({
      data: {
        name: input.name.trim(),
        slug,
        tenantStatus: OrganizationTenantStatus.pending,
        registrationContactEmail: normalizeRegistrationContactEmail(input.registrationContactEmail ?? ""),
        registrationWebsiteUrl: (input.registrationWebsiteUrl ?? "").trim(),
        registrationNote: (input.registrationNote ?? "").trim(),
        destinationWallet: "",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") || msg.includes("duplicate")) {
      throw new Error("That slug is already in use");
    }
    throw e;
  }
}

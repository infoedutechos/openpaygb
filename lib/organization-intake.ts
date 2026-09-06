import { z } from "zod";
import { OrganizationTenantStatus, OrganizationUnitKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ORGANIZATION_UNIT_KINDS, isChildUnitKind } from "@/lib/organization-unit-kinds";
import { segmentToInstitutionTier, type RegistrationSegment } from "@/lib/institution-tier";

export const orgSlugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens");

const unitKindSchema = z.enum(ORGANIZATION_UNIT_KINDS);

const pendingOrgBaseSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(48),
  registrationContactEmail: z.string().email().optional().or(z.literal("")),
  registrationWebsiteUrl: z.string().max(2048).optional().default(""),
  registrationNote: z.string().max(2000).optional().default(""),
  unitKind: unitKindSchema.optional().default("main_campus"),
  operatesUnitKinds: z.array(unitKindSchema).optional().default([]),
  parentOrganizationSlug: z.string().max(48).optional().default(""),
  externalParentName: z.string().max(200).optional().default(""),
  /** OdelPay product line: higher institutions vs schools (`higher` | `schools`). */
  registrationSegment: z.enum(["higher", "schools"]).optional(),
});

function refineOrgIntake<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const kind = data.unitKind as OrganizationUnitKind;
    if (isChildUnitKind(kind)) {
      const hasParent =
        Boolean(data.parentOrganizationSlug?.trim()) || Boolean(data.externalParentName?.trim());
      if (!hasParent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a parent institution on ODELPay HUB or enter the parent name",
          path: ["parentOrganizationSlug"],
        });
      }
    }
  });
}

export const pendingOrgBodySchema = refineOrgIntake(pendingOrgBaseSchema);

/** Self-service school registration — contact email required for verification mail. */
export const pendingOrgPublicBodySchema = refineOrgIntake(
  pendingOrgBaseSchema.extend({
    registrationContactEmail: z.string().email(),
  }),
);

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

async function resolveParentOrganizationId(slug: string): Promise<string | null> {
  const normalized = normalizeOrgSlug(slug);
  if (!normalized) return null;
  const parent = await prisma.organization.findFirst({
    where: { slug: normalized, tenantStatus: OrganizationTenantStatus.active },
    select: { id: true },
  });
  return parent?.id ?? null;
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

  const unitKind = (input.unitKind ?? "main_campus") as OrganizationUnitKind;
  let parentOrganizationId: string | null = null;
  if (input.parentOrganizationSlug?.trim()) {
    parentOrganizationId = await resolveParentOrganizationId(input.parentOrganizationSlug);
    if (!parentOrganizationId && !input.externalParentName?.trim()) {
      throw new Error("Parent institution slug not found — enter the parent name if they are not on ODELPay HUB");
    }
  }

  const operatesUnitKinds =
    unitKind === "main_campus"
      ? (input.operatesUnitKinds ?? []).filter((k: OrganizationUnitKind) => k !== "main_campus")
      : [];

  const institutionTier = input.registrationSegment
    ? segmentToInstitutionTier(input.registrationSegment as RegistrationSegment)
    : undefined;

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
        ...(institutionTier ? { institutionTier } : {}),
        unitKind,
        operatesUnitKinds: unitKind === "main_campus" ? ["main_campus", ...operatesUnitKinds] : [],
        parentOrganizationId,
        externalParentName: (input.externalParentName ?? "").trim(),
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

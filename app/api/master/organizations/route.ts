import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { z } from "zod";
import {
  createPendingOrganization,
  normalizeRegistrationContactEmail,
  pendingOrgBodySchema,
} from "@/lib/organization-intake";
import { upsertOrgAdminPassword } from "@/lib/upsert-org-admin-password";

const MasterCreateOrgBody = pendingOrgBodySchema.and(
  z.object({
    /** Optional org admin password (requires contact email). Empty = skip. Min 10 when set. */
    adminPassword: z.string().max(128).optional().default(""),
  }),
);

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const orgs = await withPrismaRetry(() =>
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          institutionTier: true,
          unitKind: true,
          operatesUnitKinds: true,
          parentOrganizationId: true,
          externalParentName: true,
          parentOrganization: { select: { name: true, slug: true } },
          tenantStatus: true,
          registrationContactEmail: true,
          registrationNote: true,
          registrationEmailVerifiedAt: true,
          destinationWallet: true,
          faviconUploadedAt: true,
          checkoutPlatformFeeUgx: true,
          fxOverrideKind: true,
          fxOverrideUgxPerTon: true,
          fxOverrideBufferPct: true,
          createdAt: true,
          _count: { select: { programmes: true, students: true, payments: true } },
        },
      }),
    );

    const organizations = orgs.map((o) => {
      const { faviconUploadedAt, registrationEmailVerifiedAt, ...rest } = o;
      return {
        ...rest,
        hasFavicon: Boolean(faviconUploadedAt),
        faviconUploadedAt: faviconUploadedAt?.toISOString() ?? null,
        registrationEmailVerifiedAt: registrationEmailVerifiedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ organizations });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/master/organizations",
      fallback: "Could not load organizations",
    });
  }
}

export async function POST(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = MasterCreateOrgBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { adminPassword, ...orgFields } = parsed.data;
    const body = {
      ...orgFields,
      registrationContactEmail: orgFields.registrationContactEmail
        ? normalizeRegistrationContactEmail(orgFields.registrationContactEmail)
        : "",
    };
    if (adminPassword?.trim() && !body.registrationContactEmail) {
      return NextResponse.json(
        { error: "Contact email is required when setting an admin password" },
        { status: 400 },
      );
    }
    if (adminPassword?.trim() && adminPassword.trim().length < 10) {
      return NextResponse.json(
        { error: "Admin password must be at least 10 characters" },
        { status: 400 },
      );
    }
    const org = await createPendingOrganization(body);
    const contactEmail = body.registrationContactEmail;
    const verifiedAt = contactEmail ? new Date() : null;
    const saved =
      verifiedAt != null
        ? await prisma.organization.update({
            where: { id: org.id },
            data: { registrationEmailVerifiedAt: verifiedAt },
          })
        : org;

    let adminProvisioned: { adminEmail: string; created: boolean } | null = null;
    if (adminPassword?.trim() && contactEmail) {
      const result = await upsertOrgAdminPassword(saved.id, {
        password: adminPassword.trim(),
        email: contactEmail,
      });
      adminProvisioned = { adminEmail: result.adminEmail, created: result.created };
    }

    const baseMsg = contactEmail
      ? "Pending tenant created. Contact email marked verified (master-provisioned)."
      : "Pending tenant created.";
    const adminMsg = adminProvisioned
      ? ` Org admin ${adminProvisioned.created ? "created" : "password set"} for ${adminProvisioned.adminEmail}.`
      : "";

    return NextResponse.json(
      {
        organization: {
          id: saved.id,
          name: saved.name,
          slug: saved.slug,
          tenantStatus: saved.tenantStatus,
          registrationEmailVerifiedAt: saved.registrationEmailVerifiedAt?.toISOString() ?? null,
        },
        adminProvisioned,
        message: `${baseMsg}${adminMsg}`,
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("already in use")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    if (msg.includes("reserved")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (
      msg.includes("master account") ||
      msg.includes("different organization") ||
      msg.includes("at least 10") ||
      msg.includes("Provide an admin")
    ) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[master/organizations POST]", e);
    return NextResponse.json({ error: "Could not create organization" }, { status: 500 });
  }
}

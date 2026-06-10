import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";
import { withPrismaRetry } from "@/lib/prisma-retry";
import {
  createPendingOrganization,
  normalizeRegistrationContactEmail,
  pendingOrgBodySchema,
} from "@/lib/organization-intake";

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
  const parsed = pendingOrgBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const body = {
      ...parsed.data,
      registrationContactEmail: parsed.data.registrationContactEmail
        ? normalizeRegistrationContactEmail(parsed.data.registrationContactEmail)
        : "",
    };
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

    return NextResponse.json(
      {
        organization: {
          id: saved.id,
          name: saved.name,
          slug: saved.slug,
          tenantStatus: saved.tenantStatus,
          registrationEmailVerifiedAt: saved.registrationEmailVerifiedAt?.toISOString() ?? null,
        },
        message: contactEmail
          ? "Pending tenant created. Contact email marked verified (master-provisioned)."
          : "Pending tenant created.",
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
    console.error("[master/organizations POST]", e);
    return NextResponse.json({ error: "Could not create organization" }, { status: 500 });
  }
}

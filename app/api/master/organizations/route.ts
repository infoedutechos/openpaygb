import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { pendingOrgBodySchema, createPendingOrganization } from "@/lib/organization-intake";

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      tenantStatus: true,
      registrationContactEmail: true,
      registrationNote: true,
      destinationWallet: true,
      faviconUploadedAt: true,
      checkoutPlatformFeeUgx: true,
      fxOverrideKind: true,
      fxOverrideUgxPerTon: true,
      fxOverrideBufferPct: true,
      createdAt: true,
      _count: { select: { programmes: true, students: true, payments: true } },
    },
  });

  const organizations = orgs.map((o) => {
    const { faviconUploadedAt, ...rest } = o;
    return {
      ...rest,
      hasFavicon: Boolean(faviconUploadedAt),
      faviconUploadedAt: faviconUploadedAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ organizations });
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
    const org = await createPendingOrganization(parsed.data);
    return NextResponse.json(
      {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          tenantStatus: org.tenantStatus,
        },
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

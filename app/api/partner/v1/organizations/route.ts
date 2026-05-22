import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePartnerAuth } from "@/lib/partner-auth";

export async function GET(req: Request) {
  const gate = await requirePartnerAuth(req, "organizations:read");
  if (!gate.ok) return gate.response;

  if (gate.partner.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: gate.partner.organizationId },
      select: { id: true, slug: true, name: true, tenantStatus: true },
    });
    if (!org) return NextResponse.json({ organizations: [] });
    return NextResponse.json({ organizations: [org] });
  }

  const rows = await prisma.organization.findMany({
    where: { tenantStatus: "active" },
    select: { id: true, slug: true, name: true, tenantStatus: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ organizations: rows });
}

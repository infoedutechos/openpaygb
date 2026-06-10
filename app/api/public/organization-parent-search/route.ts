import { NextResponse } from "next/server";
import { OrganizationTenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Search active parent institutions for school registration (slug + name). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ organizations: [] });
  }

  const rows = await prisma.organization.findMany({
    where: {
      tenantStatus: OrganizationTenantStatus.active,
      OR: [{ slug: { contains: q } }, { name: { contains: q } }],
    },
    select: { id: true, name: true, slug: true, unitKind: true },
    orderBy: { name: "asc" },
    take: 12,
  });

  return NextResponse.json({ organizations: rows });
}

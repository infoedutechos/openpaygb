import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";

const CreateBody = z.object({
  organizationSlug: z.string().optional(),
  name: z.string().min(1).max(120),
  availableQty: z.number().int().min(0).optional(),
  unavailableQty: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const items = await prisma.schoolInventoryItem.findMany({
      where: { organizationId: auth.scope.organizationId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        availableQty: i.availableQty,
        unavailableQty: i.unavailableQty,
        notes: i.notes,
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/inventory" });
  }
}

export async function POST(req: Request) {
  try {
    const body = CreateBody.parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const item = await prisma.schoolInventoryItem.create({
      data: {
        organizationId: auth.scope.organizationId,
        name: body.name.trim(),
        availableQty: body.availableQty ?? 0,
        unavailableQty: body.unavailableQty ?? 0,
        notes: body.notes?.trim() ?? "",
      },
    });

    return NextResponse.json({ id: item.id });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/inventory" });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";

function orgSlug(req: NextRequest) {
  return req.nextUrl.searchParams.get("organizationSlug");
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requireSchoolAdminScope(orgSlug(req));
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const moduleName = (req.nextUrl.searchParams.get("module") || "").trim();
    if (!moduleName) {
      return NextResponse.json({ error: "module query required" }, { status: 400 });
    }

    const rows = await prisma.schoolSmisEntry.findMany({
      where: { organizationId: gate.scope.organizationId, module: moduleName },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      entries: rows.map((r) => ({
        id: r.id,
        module: r.module,
        ...(JSON.parse(r.payloadJson || "{}") as Record<string, string>),
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/smis" });
  }
}

const Body = z.object({
  module: z.string().min(1).max(40),
  payload: z.record(z.string()).default({}),
});

export async function POST(req: NextRequest) {
  try {
    const gate = await requireSchoolAdminScope(orgSlug(req));
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const row = await prisma.schoolSmisEntry.create({
      data: {
        organizationId: gate.scope.organizationId,
        module: parsed.data.module.trim(),
        payloadJson: JSON.stringify(parsed.data.payload),
      },
    });

    return NextResponse.json(
      {
        entry: {
          id: row.id,
          module: row.module,
          ...parsed.data.payload,
          createdAt: row.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/smis" });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const gate = await requireSchoolAdminScope(orgSlug(req));
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.schoolSmisEntry.findFirst({
      where: { id, organizationId: gate.scope.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.schoolSmisEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/admin/school/smis" });
  }
}

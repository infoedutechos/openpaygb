import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFromCookies } from "@/lib/auth";
import { resolveSchoolAdminOrganization } from "@/lib/admin-school-org";
import { normalizeSchoolCode } from "@/lib/school-structure";
import { ensureProgrammeForClassStream } from "@/lib/school-structure-server";
import { prisma } from "@/lib/prisma";
import { isValidObjectId } from "@/lib/object-id";
import { apiErrorResponse } from "@/lib/api-error";

const CreateStreamBody = z.object({
  organizationSlug: z.string().min(1).optional(),
  schoolClassId: z.string().min(1),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().min(0).max(999).optional(),
  enabled: z.boolean().optional(),
  syncProgramme: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = CreateStreamBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    if (!isValidObjectId(parsed.data.schoolClassId)) {
      return NextResponse.json({ error: "Invalid schoolClassId" }, { status: 400 });
    }

    const slug = admin.role === "master" ? parsed.data.organizationSlug?.trim() : undefined;
    if (admin.role === "master" && !slug) {
      return NextResponse.json({ error: "organizationSlug is required for platform masters" }, { status: 400 });
    }

    const scope = await resolveSchoolAdminOrganization(admin, slug ?? null);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const schoolClass = await prisma.schoolClass.findFirst({
      where: { id: parsed.data.schoolClassId, organizationId: scope.organizationId },
    });
    if (!schoolClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const created = await prisma.schoolStream.create({
      data: {
        organizationId: scope.organizationId,
        schoolClassId: schoolClass.id,
        code: normalizeSchoolCode(parsed.data.code),
        name: parsed.data.name.trim(),
        sortOrder: parsed.data.sortOrder ?? 0,
        enabled: parsed.data.enabled ?? true,
      },
    });

    let programme: { programmeId: string; programmeCode: string } | null = null;
    if (parsed.data.syncProgramme !== false) {
      programme = await ensureProgrammeForClassStream(
        scope.organizationId,
        schoolClass.id,
        created.id,
      );
    }

    return NextResponse.json({ stream: created, programme }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "A stream with this code already exists for this class." }, { status: 409 });
    }
    return apiErrorResponse(e, { route: "POST /api/admin/school/streams" });
  }
}

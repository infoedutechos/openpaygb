import { NextResponse } from "next/server";
import { z } from "zod";
import { SchoolStaffSex } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { fetchResultsAppStudents, isResultsAppConfigured } from "@/lib/school-results-app-import";
import { resolveStudentEnrollmentFromClassStream } from "@/lib/school-structure-server";

const Body = z.object({
  organizationSlug: z.string().optional(),
  sessionLabel: z.string().optional(),
  classCode: z.string().optional(),
  admissionNos: z.array(z.string()).optional(),
  newOnly: z.boolean().optional(),
});

function parseSex(raw?: string): SchoolStaffSex {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "male" || v === "m") return SchoolStaffSex.male;
  if (v === "female" || v === "f") return SchoolStaffSex.female;
  return SchoolStaffSex.other;
}

export async function GET(req: Request) {
  try {
    if (!isResultsAppConfigured()) {
      return NextResponse.json({ error: "Results App integration not configured" }, { status: 503 });
    }
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const students = await fetchResultsAppStudents({
      organizationSlug: auth.scope.slug,
      sessionLabel: url.searchParams.get("sessionLabel") ?? auth.context.sessionLabel,
      classCode: url.searchParams.get("classCode") ?? undefined,
    });

    return NextResponse.json({ students });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/students/import/external" });
  }
}

export async function POST(req: Request) {
  try {
    if (!isResultsAppConfigured()) {
      return NextResponse.json({ error: "Results App integration not configured" }, { status: 503 });
    }
    const body = Body.parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const external = await fetchResultsAppStudents({
      organizationSlug: auth.scope.slug,
      sessionLabel: body.sessionLabel ?? auth.context.sessionLabel,
      classCode: body.classCode,
    });

    const selected = body.admissionNos?.length
      ? external.filter((s) => body.admissionNos!.includes(s.admissionNo ?? s.name))
      : external;

    let created = 0;
    let skipped = 0;
    const sessionId = auth.context.sessionId;

    for (const row of selected) {
      if (body.newOnly) {
        const exists = await prisma.student.findFirst({
          where: {
            organizationId: auth.scope.organizationId,
            OR: [
              ...(row.admissionNo ? [{ admissionNo: row.admissionNo }] : []),
              { name: row.name, schoolClass: { code: row.classCode } },
            ],
          },
        });
        if (exists) {
          skipped++;
          continue;
        }
      }

      const cls = await prisma.schoolClass.findFirst({
        where: { organizationId: auth.scope.organizationId, code: row.classCode },
        include: {
          streams: row.streamCode
            ? { where: { code: row.streamCode } }
            : { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      });
      const stream = cls?.streams[0];
      if (!cls || !stream) {
        skipped++;
        continue;
      }

      const enrollment = await resolveStudentEnrollmentFromClassStream({
        organizationId: auth.scope.organizationId,
        schoolClassId: cls.id,
        schoolStreamId: stream.id,
      });

      await prisma.student.create({
        data: {
          organizationId: auth.scope.organizationId,
          name: row.name.trim(),
          admissionNo: row.admissionNo?.trim() ?? "",
          email: row.email?.trim() ?? "",
          phone: row.phone?.trim() ?? "",
          address: row.address?.trim() ?? "",
          sex: parseSex(row.sex),
          programmeCode: enrollment.programmeCode,
          schoolClassId: enrollment.schoolClassId,
          schoolStreamId: enrollment.schoolStreamId,
          schoolSessionId: sessionId,
          year: 1,
          semester: auth.context.activeTerm,
        },
      });
      created++;
    }

    return NextResponse.json({ created, skipped });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/students/import/external" });
  }
}

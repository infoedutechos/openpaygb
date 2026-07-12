import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { schoolClassSessionWhere, schoolSessionWhere } from "@/lib/school-session-scope";
import { isValidObjectId } from "@/lib/object-id";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      organizationSlug?: string;
      sourceSessionId?: string;
      classIds?: string[];
      includeStudents?: boolean;
      newOnly?: boolean;
    };
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const sourceSessionId = body.sourceSessionId?.trim();
    if (!sourceSessionId || !isValidObjectId(sourceSessionId)) {
      return NextResponse.json({ error: "sourceSessionId required" }, { status: 400 });
    }

    const sourceSession = await prisma.schoolSession.findFirst({
      where: { id: sourceSessionId, organizationId: auth.scope.organizationId },
    });
    if (!sourceSession) return NextResponse.json({ error: "Source session not found" }, { status: 404 });

    const targetSessionId = auth.context.sessionId;

    const classes = await prisma.schoolClass.findMany({
      where: {
        organizationId: auth.scope.organizationId,
        ...schoolClassSessionWhere(sourceSessionId),
        ...(body.classIds?.length ? { id: { in: body.classIds } } : {}),
      },
      include: { streams: true },
    });

    let classesCreated = 0;
    let studentsCopied = 0;

    for (const srcClass of classes) {
      let targetClass = await prisma.schoolClass.findFirst({
        where: { organizationId: auth.scope.organizationId, code: srcClass.code },
      });
      if (!targetClass) {
        targetClass = await prisma.schoolClass.create({
          data: {
            organizationId: auth.scope.organizationId,
            code: srcClass.code,
            name: srcClass.name,
            levelKind: srcClass.levelKind,
            sortOrder: srcClass.sortOrder,
            enabled: srcClass.enabled,
            schoolSessionId: targetSessionId,
          },
        });
        classesCreated++;
      }

      for (const srcStream of srcClass.streams) {
        const targetStream = await prisma.schoolStream.findFirst({
          where: { organizationId: auth.scope.organizationId, schoolClassId: targetClass.id, code: srcStream.code },
        });
        if (!targetStream) {
          await prisma.schoolStream.create({
            data: {
              organizationId: auth.scope.organizationId,
              schoolClassId: targetClass.id,
              code: srcStream.code,
              name: srcStream.name,
              sortOrder: srcStream.sortOrder,
              enabled: srcStream.enabled,
            },
          });
        }
      }

      if (body.includeStudents) {
        const students = await prisma.student.findMany({
          where: {
            organizationId: auth.scope.organizationId,
            schoolClassId: srcClass.id,
            ...schoolSessionWhere(sourceSessionId),
          },
        });
        for (const s of students) {
          if (body.newOnly) {
            const exists = await prisma.student.findFirst({
              where: { organizationId: auth.scope.organizationId, admissionNo: s.admissionNo, name: s.name },
            });
            if (exists) continue;
          }
          const stream = await prisma.schoolStream.findFirst({
            where: { organizationId: auth.scope.organizationId, schoolClassId: targetClass.id },
          });
          await prisma.student.create({
            data: {
              organizationId: auth.scope.organizationId,
              name: s.name,
              admissionNo: s.admissionNo,
              email: s.email,
              phone: s.phone,
              address: s.address,
              sex: s.sex,
              programmeCode: s.programmeCode,
              schoolClassId: targetClass.id,
              schoolStreamId: stream?.id ?? null,
              schoolSessionId: targetSessionId,
              year: s.year,
              semester: s.semester,
            },
          });
          studentsCopied++;
        }
      }
    }

    return NextResponse.json({ classesCreated, studentsCopied, sessionLabel: sourceSession.label });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/classes/import" });
  }
}

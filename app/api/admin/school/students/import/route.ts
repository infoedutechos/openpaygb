import { NextResponse } from "next/server";
import { SchoolStaffSex } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { schoolSessionWhere } from "@/lib/school-session-scope";
import { csvCell, csvResponse, mapCsvHeaders, parseCsv } from "@/lib/school-csv";
import { resolveStudentEnrollmentFromClassStream } from "@/lib/school-structure-server";
import { isValidObjectId } from "@/lib/object-id";

function parseSex(raw: string): SchoolStaffSex {
  const v = raw.trim().toLowerCase();
  if (v === "male" || v === "m") return SchoolStaffSex.male;
  if (v === "female" || v === "f") return SchoolStaffSex.female;
  return SchoolStaffSex.other;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const auth = await requireSchoolAdminScope(String(form.get("organizationSlug") ?? "") || undefined);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const file = form.get("file");
    const newOnly = form.get("newOnly") === "true";
    const classId = String(form.get("classId") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file required" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) return NextResponse.json({ error: "Empty CSV" }, { status: 400 });

    const headers = mapCsvHeaders(rows[0] ?? []);
    let created = 0;
    let skipped = 0;

    for (const row of rows.slice(1)) {
      const name = csvCell(row, headers, "name");
      if (!name) continue;

      const admissionNo = csvCell(row, headers, "admissionno") || csvCell(row, headers, "admission no");
      const email = csvCell(row, headers, "email");
      const phone = csvCell(row, headers, "phone") || csvCell(row, headers, "tel");
      const address = csvCell(row, headers, "address");
      const sex = parseSex(csvCell(row, headers, "sex"));
      const classCode = csvCell(row, headers, "class");
      const streamCode = csvCell(row, headers, "stream");

      if (newOnly && admissionNo) {
        const exists = await prisma.student.findFirst({
          where: { organizationId: auth.scope.organizationId, admissionNo },
          select: { id: true },
        });
        if (exists) {
          skipped++;
          continue;
        }
      }

      let programmeCode = csvCell(row, headers, "programmecode").toUpperCase();
      let schoolClassId: string | null = null;
      let schoolStreamId: string | null = null;

      if (classCode && streamCode) {
        const cls = await prisma.schoolClass.findFirst({
          where: { organizationId: auth.scope.organizationId, code: classCode },
          include: { streams: { where: { code: streamCode } } },
        });
        const stream = cls?.streams[0];
        if (cls && stream) {
          const enrollment = await resolveStudentEnrollmentFromClassStream({
            organizationId: auth.scope.organizationId,
            schoolClassId: cls.id,
            schoolStreamId: stream.id,
          });
          programmeCode = enrollment.programmeCode;
          schoolClassId = enrollment.schoolClassId;
          schoolStreamId = enrollment.schoolStreamId;
        }
      } else if (classId && isValidObjectId(classId)) {
        const stream = await prisma.schoolStream.findFirst({
          where: { organizationId: auth.scope.organizationId, schoolClassId: classId },
          orderBy: { sortOrder: "asc" },
        });
        if (stream) {
          const enrollment = await resolveStudentEnrollmentFromClassStream({
            organizationId: auth.scope.organizationId,
            schoolClassId: classId,
            schoolStreamId: stream.id,
          });
          programmeCode = enrollment.programmeCode;
          schoolClassId = enrollment.schoolClassId;
          schoolStreamId = enrollment.schoolStreamId;
        }
      }

      if (!programmeCode) programmeCode = admissionNo || `STU-${Date.now()}`;

      await prisma.student.create({
        data: {
          organizationId: auth.scope.organizationId,
          name,
          admissionNo,
          email,
          phone,
          address,
          sex,
          programmeCode,
          schoolClassId,
          schoolStreamId,
          schoolSessionId: auth.context.sessionId,
          year: 1,
          semester: auth.context.activeTerm,
        },
      });
      created++;
    }

    return NextResponse.json({ created, skipped });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/students/import" });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const classId = url.searchParams.get("classId");
    const students = await prisma.student.findMany({
      where: {
        organizationId: auth.scope.organizationId,
        ...schoolSessionWhere(auth.context.sessionId),
        ...(classId ? { schoolClassId: classId } : {}),
      },
      include: {
        schoolClass: { select: { code: true } },
        schoolStream: { select: { code: true } },
      },
      orderBy: { name: "asc" },
      take: 5000,
    });

    const header = ["Name", "AdmissionNo", "Sex", "Phone", "Email", "Address", "Class", "Stream", "ProgrammeCode"];
    const dataRows = students.map((s) => [
      s.name,
      s.admissionNo,
      s.sex,
      s.phone,
      s.email,
      s.address,
      s.schoolClass?.code ?? "",
      s.schoolStream?.code ?? "",
      s.programmeCode,
    ]);

    return csvResponse(`school-students-${new Date().toISOString().slice(0, 10)}.csv`, header, dataRows);
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/students/export" });
  }
}

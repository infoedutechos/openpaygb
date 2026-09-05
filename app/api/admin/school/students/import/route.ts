import { NextResponse } from "next/server";
import { SchoolStaffSex } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { csvCell, mapCsvHeaders, parseCsv } from "@/lib/school-csv";
import { exportSchoolStudentsCsv } from "@/lib/school-students-export";
import { resolveStudentEnrollmentFromClassStream } from "@/lib/school-structure-server";
import { isValidObjectId } from "@/lib/object-id";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { allocateAdmissionNo } from "@/lib/admission-no";
import { copyClassTermBillsToStudent } from "@/lib/school-copy-class-bills";

function parseSex(raw: string): SchoolStaffSex {
  const v = raw.trim().toLowerCase();
  if (v === "male" || v === "m") return SchoolStaffSex.male;
  if (v === "female" || v === "f") return SchoolStaffSex.female;
  return SchoolStaffSex.other;
}

function parseYear(raw: string, fallback: number): number {
  const n = parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(6, Math.trunc(n));
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const auth = await requireSchoolAdminScope(String(form.get("organizationSlug") ?? "") || undefined);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const file = form.get("file");
    const newOnly = form.get("newOnly") === "true";
    const classId = String(form.get("classId") ?? "").trim();
    const sourceSessionId = String(form.get("sourceSessionId") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file required" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) return NextResponse.json({ error: "Empty CSV" }, { status: 400 });

    const headers = mapCsvHeaders(rows[0] ?? []);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    let sessionId = auth.context.sessionId;
    if (sourceSessionId && isValidObjectId(sourceSessionId)) {
      const sess = await prisma.schoolSession.findFirst({
        where: { id: sourceSessionId, organizationId: auth.scope.organizationId },
        select: { id: true },
      });
      if (sess) sessionId = sess.id;
    }

    const sessionsByLabel = new Map(
      (
        await prisma.schoolSession.findMany({
          where: { organizationId: auth.scope.organizationId },
          select: { id: true, label: true },
        })
      ).map((s) => [s.label.trim().toLowerCase(), s.id] as const),
    );

    for (const row of rows.slice(1)) {
      const name = csvCell(row, headers, "name");
      if (!name) continue;

      let admissionNo =
        csvCell(row, headers, "admissionno") || csvCell(row, headers, "admission no");
      const email = csvCell(row, headers, "email").toLowerCase();
      const phone = csvCell(row, headers, "phone") || csvCell(row, headers, "tel");
      const address = csvCell(row, headers, "address");
      const telegramId =
        csvCell(row, headers, "telegramid") ||
        csvCell(row, headers, "telegram") ||
        csvCell(row, headers, "telegram id");
      const sex = parseSex(csvCell(row, headers, "sex"));
      const classCode = csvCell(row, headers, "class");
      const streamCode = csvCell(row, headers, "stream");
      const year = parseYear(csvCell(row, headers, "year"), 1);
      const term = normalizeSchoolTerm(
        csvCell(row, headers, "term") ||
          csvCell(row, headers, "semester") ||
          String(auth.context.activeTerm),
      );
      const sessionLabel = csvCell(row, headers, "session");
      const portalPassword =
        csvCell(row, headers, "portalpassword") || csvCell(row, headers, "portal password");

      const existing = admissionNo
        ? await prisma.student.findFirst({
            where: { organizationId: auth.scope.organizationId, admissionNo },
            select: { id: true, schoolClassId: true },
          })
        : null;

      if (existing && newOnly) {
        skipped++;
        continue;
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
      } else if (classCode) {
        const cls = await prisma.schoolClass.findFirst({
          where: { organizationId: auth.scope.organizationId, code: classCode },
          include: { streams: { orderBy: { sortOrder: "asc" }, take: 1 } },
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

      let rowSessionId = sessionId;
      if (sessionLabel) {
        const matched = sessionsByLabel.get(sessionLabel.trim().toLowerCase());
        if (matched) rowSessionId = matched;
      }

      const portalPasswordHash =
        portalPassword.trim().length >= 10 ? await bcrypt.hash(portalPassword.trim(), 10) : undefined;

      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: {
            name,
            email,
            phone,
            address,
            sex,
            telegramId,
            programmeCode,
            schoolClassId,
            schoolStreamId,
            schoolSessionId: rowSessionId,
            year,
            semester: term,
            ...(portalPasswordHash ? { portalPasswordHash } : {}),
          },
        });
        updated++;
        continue;
      }

      if (!admissionNo) {
        admissionNo = await allocateAdmissionNo(auth.scope.organizationId);
      }

      const doc = await prisma.student.create({
        data: {
          organizationId: auth.scope.organizationId,
          name,
          admissionNo,
          email,
          phone,
          address,
          sex,
          telegramId,
          programmeCode,
          schoolClassId,
          schoolStreamId,
          schoolSessionId: rowSessionId,
          year,
          semester: term,
          ...(portalPasswordHash ? { portalPasswordHash } : {}),
        },
      });

      if (schoolClassId) {
        await copyClassTermBillsToStudent({
          organizationId: auth.scope.organizationId,
          studentId: doc.id,
          schoolClassId,
          term,
          sessionId: rowSessionId,
        });
      }
      created++;
    }

    return NextResponse.json({ created, updated, skipped });
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
    const template = url.searchParams.get("template") === "1";
    return exportSchoolStudentsCsv({
      organizationId: auth.scope.organizationId,
      sessionId: auth.context.sessionId,
      classId,
      template,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/students/import" });
  }
}

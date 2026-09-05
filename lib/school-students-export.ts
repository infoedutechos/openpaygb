import { prisma } from "@/lib/prisma";
import { csvResponse } from "@/lib/school-csv";
import { schoolSessionWhere } from "@/lib/school-session-scope";
import {
  SCHOOL_STUDENT_REGISTER_HEADERS,
  SCHOOL_STUDENT_REGISTER_SAMPLE_ROW,
  SCHOOL_STUDENT_REGISTER_TEMPLATE_HEADERS,
} from "@/lib/school-students-register";

export async function exportSchoolStudentsCsv(input: {
  organizationId: string;
  sessionId?: string | null;
  classId?: string | null;
  template?: boolean;
}) {
  if (input.template) {
    return csvResponse(
      `school-students-register-template.csv`,
      [...SCHOOL_STUDENT_REGISTER_TEMPLATE_HEADERS],
      [SCHOOL_STUDENT_REGISTER_SAMPLE_ROW],
    );
  }

  const students = await prisma.student.findMany({
    where: {
      organizationId: input.organizationId,
      ...schoolSessionWhere(input.sessionId),
      ...(input.classId ? { schoolClassId: input.classId } : {}),
    },
    include: {
      schoolClass: { select: { code: true } },
      schoolStream: { select: { code: true } },
      schoolSession: { select: { label: true } },
    },
    orderBy: { name: "asc" },
    take: 5000,
  });

  const dataRows = students.map((s) => [
    s.name,
    s.admissionNo,
    s.sex,
    s.phone,
    s.email,
    s.address,
    s.telegramId,
    s.schoolClass?.code ?? "",
    s.schoolStream?.code ?? "",
    s.programmeCode,
    s.year,
    s.semester,
    s.schoolSession?.label ?? "",
  ]);

  return csvResponse(
    `school-students-register-${new Date().toISOString().slice(0, 10)}.csv`,
    [...SCHOOL_STUDENT_REGISTER_HEADERS],
    dataRows,
  );
}

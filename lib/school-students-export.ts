import { prisma } from "@/lib/prisma";
import { csvResponse } from "@/lib/school-csv";
import { schoolSessionWhere } from "@/lib/school-session-scope";

export async function exportSchoolStudentsCsv(input: {
  organizationId: string;
  sessionId?: string | null;
  classId?: string | null;
}) {
  const students = await prisma.student.findMany({
    where: {
      organizationId: input.organizationId,
      ...schoolSessionWhere(input.sessionId),
      ...(input.classId ? { schoolClassId: input.classId } : {}),
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
}

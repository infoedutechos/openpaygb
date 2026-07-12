import { SchoolStaffSex } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchResultsAppStudents, type ResultsAppStudentRow } from "@/lib/school-results-app-import";
import { resolveStudentEnrollmentFromClassStream } from "@/lib/school-structure-server";

function parseSex(raw?: string): SchoolStaffSex {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "male" || v === "m") return SchoolStaffSex.male;
  if (v === "female" || v === "f") return SchoolStaffSex.female;
  return SchoolStaffSex.other;
}

async function importStudentRow(input: {
  organizationId: string;
  sessionId: string | null;
  activeTerm: number;
  row: ResultsAppStudentRow;
  newOnly?: boolean;
}): Promise<"created" | "skipped"> {
  if (input.newOnly) {
    const exists = await prisma.student.findFirst({
      where: {
        organizationId: input.organizationId,
        OR: [
          ...(input.row.admissionNo ? [{ admissionNo: input.row.admissionNo }] : []),
          { name: input.row.name, schoolClass: { code: input.row.classCode } },
        ],
      },
    });
    if (exists) return "skipped";
  }

  const cls = await prisma.schoolClass.findFirst({
    where: { organizationId: input.organizationId, code: input.row.classCode },
    include: {
      streams: input.row.streamCode
        ? { where: { code: input.row.streamCode } }
        : { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
  const stream = cls?.streams[0];
  if (!cls || !stream) return "skipped";

  const enrollment = await resolveStudentEnrollmentFromClassStream({
    organizationId: input.organizationId,
    schoolClassId: cls.id,
    schoolStreamId: stream.id,
  });

  await prisma.student.create({
    data: {
      organizationId: input.organizationId,
      name: input.row.name.trim(),
      admissionNo: input.row.admissionNo?.trim() ?? "",
      email: input.row.email?.trim() ?? "",
      phone: input.row.phone?.trim() ?? "",
      address: input.row.address?.trim() ?? "",
      sex: parseSex(input.row.sex),
      programmeCode: enrollment.programmeCode,
      schoolClassId: enrollment.schoolClassId,
      schoolStreamId: enrollment.schoolStreamId,
      schoolSessionId: input.sessionId,
      year: 1,
      semester: input.activeTerm,
    },
  });
  return "created";
}

export async function importResultsAppStudents(input: {
  organizationId: string;
  organizationSlug: string;
  sessionLabel: string;
  sessionId: string | null;
  activeTerm: number;
  classCode?: string;
  classCodes?: string[];
  admissionNos?: string[];
  newOnly?: boolean;
}): Promise<{ created: number; skipped: number }> {
  const external = await fetchResultsAppStudents({
    organizationSlug: input.organizationSlug,
    sessionLabel: input.sessionLabel,
    classCode: input.classCodes?.length === 1 ? input.classCodes[0] : input.classCode,
  });

  let rows = external;
  if (input.classCodes?.length) {
    rows = rows.filter((s) => input.classCodes!.includes(s.classCode));
  }
  if (input.admissionNos?.length) {
    rows = rows.filter((s) => input.admissionNos!.includes(s.admissionNo ?? s.name));
  }

  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const result = await importStudentRow({
      organizationId: input.organizationId,
      sessionId: input.sessionId,
      activeTerm: input.activeTerm,
      row,
      newOnly: input.newOnly,
    });
    if (result === "created") created++;
    else skipped++;
  }
  return { created, skipped };
}

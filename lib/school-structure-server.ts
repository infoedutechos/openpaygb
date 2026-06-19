import { ProgrammeTrack } from "@/lib/programme-track";
import { prisma } from "@/lib/prisma";
import { revalidateProgrammesCache } from "@/lib/cached-programmes";
import {
  buildProgrammeCodeFromClassStream,
  buildProgrammeNameFromClassStream,
} from "@/lib/school-structure";

/** Ensure a checkout programme exists for a class + stream pair. */
export async function ensureProgrammeForClassStream(
  organizationId: string,
  schoolClassId: string,
  schoolStreamId: string,
): Promise<{ programmeId: string; programmeCode: string }> {
  const [schoolClass, stream] = await Promise.all([
    prisma.schoolClass.findFirst({
      where: { id: schoolClassId, organizationId },
      select: { id: true, code: true, name: true },
    }),
    prisma.schoolStream.findFirst({
      where: { id: schoolStreamId, organizationId, schoolClassId },
      select: { id: true, code: true, name: true },
    }),
  ]);
  if (!schoolClass || !stream) {
    throw new Error("Class or stream not found for this school");
  }

  const code = buildProgrammeCodeFromClassStream(schoolClass.code, stream.code);
  const name = buildProgrammeNameFromClassStream(schoolClass.name, stream.name);

  const programme = await prisma.programme.upsert({
    where: {
      organizationId_code: { organizationId, code },
    },
    create: {
      organizationId,
      code,
      name,
      track: ProgrammeTrack.regular,
      semestersPerYear: 3,
      durationYears: 1,
      schoolClassId: schoolClass.id,
      schoolStreamId: stream.id,
    },
    update: {
      name,
      schoolClassId: schoolClass.id,
      schoolStreamId: stream.id,
    },
    select: { id: true, code: true },
  });

  revalidateProgrammesCache(organizationId);
  return { programmeId: programme.id, programmeCode: programme.code };
}

export async function resolveStudentEnrollmentFromClassStream(input: {
  organizationId: string;
  schoolClassId: string;
  schoolStreamId: string;
}): Promise<{ programmeCode: string; schoolClassId: string; schoolStreamId: string }> {
  const { programmeCode } = await ensureProgrammeForClassStream(
    input.organizationId,
    input.schoolClassId,
    input.schoolStreamId,
  );
  return {
    programmeCode,
    schoolClassId: input.schoolClassId,
    schoolStreamId: input.schoolStreamId,
  };
}

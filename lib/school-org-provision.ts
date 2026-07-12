import { prisma } from "@/lib/prisma";
import { ensureDefaultSchoolAccounts } from "@/lib/school-accounts-seed";
import { currentAcademicYearLabel } from "@/lib/school-session-scope";

/** Seed default chart of accounts + first active session when a school workspace is activated. */
export async function provisionSchoolErpDefaults(organizationId: string): Promise<{
  sessionId: string | null;
  sessionLabel: string;
}> {
  await ensureDefaultSchoolAccounts(organizationId);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { institutionTier: true, activeSchoolSessionId: true, currentAcademicYearLabel: true },
  });
  if (org?.institutionTier !== "school") {
    return { sessionId: null, sessionLabel: "" };
  }

  if (org.activeSchoolSessionId) {
    const active = await prisma.schoolSession.findUnique({
      where: { id: org.activeSchoolSessionId },
      select: { id: true, label: true },
    });
    if (active) return { sessionId: active.id, sessionLabel: active.label };
  }

  const label = org.currentAcademicYearLabel?.trim() || currentAcademicYearLabel();
  let session = await prisma.schoolSession.findFirst({
    where: { organizationId, label },
    select: { id: true, label: true },
  });

  if (!session) {
    session = await prisma.schoolSession.create({
      data: { organizationId, label, isActive: true },
      select: { id: true, label: true },
    });
    await prisma.schoolSession.updateMany({
      where: { organizationId, id: { not: session.id } },
      data: { isActive: false },
    });
  } else if (!(await prisma.schoolSession.findFirst({ where: { id: session.id, isActive: true } }))) {
    await prisma.$transaction([
      prisma.schoolSession.updateMany({
        where: { organizationId, id: { not: session.id } },
        data: { isActive: false },
      }),
      prisma.schoolSession.update({ where: { id: session.id }, data: { isActive: true } }),
    ]);
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      activeSchoolSessionId: session.id,
      currentAcademicYearLabel: session.label,
      activeSchoolTerm: 1,
    },
  });

  return { sessionId: session.id, sessionLabel: session.label };
}

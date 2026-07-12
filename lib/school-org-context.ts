import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm } from "@/lib/school-term";

export type SchoolOrgContext = {
  organizationId: string;
  slug: string;
  activeTerm: number;
  sessionId: string | null;
  sessionLabel: string;
  currentAcademicYearLabel: string;
};

export async function loadSchoolOrgContext(organizationId: string): Promise<SchoolOrgContext | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      slug: true,
      activeSchoolTerm: true,
      currentAcademicYearLabel: true,
      activeSchoolSessionId: true,
      activeSchoolSession: { select: { id: true, label: true } },
    },
  });
  if (!org) return null;

  let sessionLabel = org.activeSchoolSession?.label?.trim() ?? org.currentAcademicYearLabel.trim();
  let sessionId = org.activeSchoolSessionId;

  if (!sessionLabel) {
    const active = await prisma.schoolSession.findFirst({
      where: { organizationId, isActive: true },
      select: { id: true, label: true },
    });
    if (active) {
      sessionId = active.id;
      sessionLabel = active.label;
    }
  }

  return {
    organizationId: org.id,
    slug: org.slug,
    activeTerm: normalizeSchoolTerm(org.activeSchoolTerm),
    sessionId,
    sessionLabel: sessionLabel || "—",
    currentAcademicYearLabel: org.currentAcademicYearLabel.trim(),
  };
}

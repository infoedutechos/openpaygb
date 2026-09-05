import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { ensureDefaultSchoolTerms } from "@/lib/school-terms";

export type SchoolOrgContext = {
  organizationId: string;
  slug: string;
  activeTerm: number;
  activeTermId: string | null;
  activeTermLabel: string;
  sessionId: string | null;
  sessionLabel: string;
  currentAcademicYearLabel: string;
};

export async function loadSchoolOrgContext(organizationId: string): Promise<SchoolOrgContext | null> {
  await ensureDefaultSchoolTerms(organizationId);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      slug: true,
      activeSchoolTerm: true,
      activeSchoolTermId: true,
      currentAcademicYearLabel: true,
      activeSchoolSessionId: true,
      activeSchoolSession: { select: { id: true, label: true } },
      activeSchoolTermRow: { select: { id: true, label: true, termNumber: true } },
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

  let activeTermRow = org.activeSchoolTermRow;
  if (!activeTermRow) {
    activeTermRow = await prisma.schoolTerm.findFirst({
      where: { organizationId, isActive: true },
      select: { id: true, label: true, termNumber: true },
    });
  }
  if (!activeTermRow) {
    activeTermRow = await prisma.schoolTerm.findFirst({
      where: { organizationId, termNumber: normalizeSchoolTerm(org.activeSchoolTerm) },
      select: { id: true, label: true, termNumber: true },
    });
  }

  const activeTerm = activeTermRow?.termNumber ?? normalizeSchoolTerm(org.activeSchoolTerm);

  return {
    organizationId: org.id,
    slug: org.slug,
    activeTerm,
    activeTermId: activeTermRow?.id ?? org.activeSchoolTermId ?? null,
    activeTermLabel: activeTermRow?.label ?? `Term ${activeTerm}`,
    sessionId,
    sessionLabel: sessionLabel || "—",
    currentAcademicYearLabel: org.currentAcademicYearLabel.trim(),
  };
}

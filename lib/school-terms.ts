import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm, schoolTermLabel } from "@/lib/school-term";

/** Ensure org has at least Term 1–3 rows (customisable labels). */
export async function ensureDefaultSchoolTerms(organizationId: string) {
  const existing = await prisma.schoolTerm.count({ where: { organizationId } });
  if (existing > 0) return;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { activeSchoolTerm: true },
  });
  const activeNum = normalizeSchoolTerm(org?.activeSchoolTerm);

  await prisma.$transaction(
    [1, 2, 3].map((n) =>
      prisma.schoolTerm.create({
        data: {
          organizationId,
          label: schoolTermLabel(n),
          termNumber: n,
          isActive: n === activeNum,
        },
      }),
    ),
  );

  const active = await prisma.schoolTerm.findFirst({
    where: { organizationId, isActive: true },
  });
  if (active) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        activeSchoolTermId: active.id,
        activeSchoolTerm: active.termNumber,
      },
    });
  }
}

export async function listSchoolTerms(organizationId: string) {
  await ensureDefaultSchoolTerms(organizationId);
  return prisma.schoolTerm.findMany({
    where: { organizationId },
    orderBy: [{ termNumber: "asc" }, { label: "asc" }],
  });
}

export async function nextSchoolTermNumber(organizationId: string): Promise<number> {
  const max = await prisma.schoolTerm.findFirst({
    where: { organizationId },
    orderBy: { termNumber: "desc" },
    select: { termNumber: true },
  });
  return (max?.termNumber ?? 0) + 1;
}

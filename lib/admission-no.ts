import { prisma } from "@/lib/prisma";

/**
 * SchoolPay-style admission / registration numbers.
 * Format: `{PREFIX}-{YYYY}-{NNNN}` e.g. `RIV-2026-0042`
 */
export function admissionNoPrefixFromSlug(slug: string): string {
  const cleaned = slug
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (cleaned.length >= 3) return cleaned.slice(0, 3);
  if (cleaned.length > 0) return cleaned.padEnd(3, "X");
  return "STU";
}

export function formatAdmissionNo(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

/** Allocate the next unique admission number for an organization. */
export async function allocateAdmissionNo(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true },
  });
  const prefix = admissionNoPrefixFromSlug(org?.slug ?? "STU");
  const year = new Date().getFullYear();
  const yearPrefix = `${prefix}-${year}-`;

  const existing = await prisma.student.findMany({
    where: {
      organizationId,
      admissionNo: { startsWith: yearPrefix },
    },
    select: { admissionNo: true },
    take: 2000,
  });

  let maxSeq = 0;
  for (const row of existing) {
    const raw = row.admissionNo.slice(yearPrefix.length);
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const candidate = formatAdmissionNo(prefix, year, maxSeq + attempt);
    const clash = await prisma.student.findFirst({
      where: { organizationId, admissionNo: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
  }

  // Extremely unlikely fallback — timestamp suffix
  return `${prefix}-${year}-${String(Date.now()).slice(-6)}`;
}

export function studentCardPath(studentId: string): string {
  return `/student/card/${encodeURIComponent(studentId)}`;
}

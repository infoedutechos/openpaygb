import { prisma } from "@/lib/prisma";
import {
  admissionStem,
  formatAdmissionNoParts,
  orgToAdmissionFormatConfig,
  parseAdmissionSequence,
  resolveYearToken,
} from "@/lib/admission-format";

export * from "@/lib/admission-format";

/**
 * Allocate the next unique admission number for an organization.
 * Sequence is based on ALL registered students for that school: max matching seq,
 * or student count when no matching numbers exist yet (registered-first).
 */
export async function allocateAdmissionNo(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      slug: true,
      admissionFormatConfigured: true,
      admissionPrefix: true,
      admissionIncludeYear: true,
      admissionYearSource: true,
      admissionSeqDigits: true,
      admissionSeparator: true,
      admissionSeqStart: true,
      currentAcademicYearLabel: true,
    },
  });
  const cfg = orgToAdmissionFormatConfig(
    org ?? {
      slug: "STU",
      admissionFormatConfigured: false,
      admissionPrefix: "",
      admissionIncludeYear: true,
      admissionYearSource: "calendar",
      admissionSeqDigits: 4,
      admissionSeparator: "-",
      admissionSeqStart: 1,
      currentAcademicYearLabel: "",
    },
  );
  const yearToken = resolveYearToken(cfg);
  const stem = admissionStem(cfg.prefix, yearToken, cfg.separator);

  const existing = await prisma.student.findMany({
    where: { organizationId },
    select: { admissionNo: true },
    take: 50_000,
  });

  let maxSeq = 0;
  for (const row of existing) {
    const n = parseAdmissionSequence(row.admissionNo, stem, cfg.prefix, cfg.separator);
    if (n != null && n > maxSeq) maxSeq = n;
  }

  const baseline = maxSeq > 0 ? maxSeq : Math.max(cfg.seqStart - 1, existing.length);
  const startFrom = baseline + 1;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = formatAdmissionNoParts(
      cfg.prefix,
      yearToken,
      startFrom + attempt,
      cfg.seqDigits,
      cfg.separator,
    );
    const clash = await prisma.student.findFirst({
      where: { organizationId, admissionNo: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
  }

  return formatAdmissionNoParts(
    cfg.prefix,
    yearToken,
    Date.now() % 1_000_000,
    cfg.seqDigits,
    cfg.separator,
  );
}

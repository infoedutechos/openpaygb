import { prisma } from "@/lib/prisma";
import {
  formatAdmissionNoParts,
  orgToStaffFormatConfig,
  parseAdmissionSequence,
  resolveYearToken,
} from "@/lib/staff-format";
import { admissionStem } from "@/lib/admission-format";

export * from "@/lib/staff-format";

/**
 * Allocate the next unique Staff ID for an organization (all registered staff).
 */
export async function allocateStaffCode(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      slug: true,
      staffFormatConfigured: true,
      staffPrefix: true,
      staffIncludeYear: true,
      staffYearSource: true,
      staffSeqDigits: true,
      staffSeparator: true,
      staffSeqStart: true,
      currentAcademicYearLabel: true,
    },
  });
  const cfg = orgToStaffFormatConfig(
    org ?? {
      slug: "STF",
      staffFormatConfigured: false,
      staffPrefix: "",
      staffIncludeYear: true,
      staffYearSource: "calendar",
      staffSeqDigits: 4,
      staffSeparator: "-",
      staffSeqStart: 1,
      currentAcademicYearLabel: "",
    },
  );
  const yearToken = resolveYearToken(cfg);
  const stem = admissionStem(cfg.prefix, yearToken, cfg.separator);

  const existing = await prisma.schoolStaff.findMany({
    where: { organizationId },
    select: { staffCode: true },
    take: 50_000,
  });

  let maxSeq = 0;
  for (const row of existing) {
    const n = parseAdmissionSequence(row.staffCode, stem, cfg.prefix, cfg.separator);
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
    const clash = await prisma.schoolStaff.findFirst({
      where: { organizationId, staffCode: candidate },
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

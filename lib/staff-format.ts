/**
 * Staff ID format helpers (mirror admission numbers). Safe for client + server.
 * DB allocation: `lib/staff-code.ts`.
 */

import {
  academicYearToken,
  clampSeqDigits,
  clampSeqStart,
  formatAdmissionNoParts,
  normalizeYearSource,
  parseAdmissionSequence,
  resolveYearToken,
  sanitizeAdmissionSeparator,
  type AdmissionFormatConfig,
  type AdmissionFormatPreview,
  type AdmissionYearSource,
} from "@/lib/admission-format";

export type StaffFormatConfig = AdmissionFormatConfig;
export type StaffFormatPreview = AdmissionFormatPreview;
export type StaffYearSource = AdmissionYearSource;

export const STAFF_FORMAT_SETTINGS_PATH = "/admin/settings#staff-id";

export function staffCodePrefixFromSlug(slug: string): string {
  const cleaned = slug
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (cleaned.length >= 3) return `S${cleaned.slice(0, 2)}`;
  if (cleaned.length > 0) return `S${cleaned.padEnd(2, "X")}`;
  return "STF";
}

export function sanitizeStaffPrefix(raw: string, slugFallback: string): string {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  if (cleaned) return cleaned;
  return staffCodePrefixFromSlug(slugFallback);
}

export function orgToStaffFormatConfig(org: {
  slug: string;
  staffFormatConfigured?: boolean | null;
  staffPrefix?: string | null;
  staffIncludeYear?: boolean | null;
  staffYearSource?: string | null;
  staffSeqDigits?: number | null;
  staffSeparator?: string | null;
  staffSeqStart?: number | null;
  currentAcademicYearLabel?: string | null;
}): StaffFormatConfig {
  return {
    configured: Boolean(org.staffFormatConfigured),
    prefix: sanitizeStaffPrefix(org.staffPrefix ?? "", org.slug),
    includeYear: org.staffIncludeYear !== false,
    yearSource: normalizeYearSource(org.staffYearSource),
    seqDigits: clampSeqDigits(org.staffSeqDigits ?? 4),
    separator: sanitizeAdmissionSeparator(org.staffSeparator ?? "-"),
    seqStart: clampSeqStart(org.staffSeqStart ?? 1),
    academicYearLabel: org.currentAcademicYearLabel?.trim() ?? "",
    slug: org.slug,
  };
}

export function previewStaffFormat(cfg: StaffFormatConfig, sampleSeq = 1): StaffFormatPreview {
  const yearToken = resolveYearToken(cfg);
  return {
    example: formatAdmissionNoParts(cfg.prefix, yearToken, sampleSeq, cfg.seqDigits, cfg.separator),
    prefix: cfg.prefix,
    yearToken,
    seqDigits: cfg.seqDigits,
    separator: cfg.separator,
    configured: cfg.configured,
  };
}

export {
  academicYearToken,
  clampSeqDigits,
  clampSeqStart,
  formatAdmissionNoParts,
  normalizeYearSource,
  parseAdmissionSequence,
  resolveYearToken,
  sanitizeAdmissionSeparator,
};

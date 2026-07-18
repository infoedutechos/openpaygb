/**
 * Pure admission-number format helpers (safe for client + server).
 * DB allocation lives in `lib/admission-no.ts`.
 */

export type AdmissionYearSource = "calendar" | "academic" | "none";

export type AdmissionFormatConfig = {
  configured: boolean;
  prefix: string;
  includeYear: boolean;
  yearSource: AdmissionYearSource;
  seqDigits: number;
  separator: string;
  seqStart: number;
  academicYearLabel: string;
  slug: string;
};

export type AdmissionFormatPreview = {
  example: string;
  prefix: string;
  yearToken: string | null;
  seqDigits: number;
  separator: string;
  configured: boolean;
};

/** Settings deep-link for admission format configuration. */
export const ADMISSION_FORMAT_SETTINGS_PATH = "/admin/settings#admission-number";

export function admissionNoPrefixFromSlug(slug: string): string {
  const cleaned = slug
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (cleaned.length >= 3) return cleaned.slice(0, 3);
  if (cleaned.length > 0) return cleaned.padEnd(3, "X");
  return "STU";
}

export function sanitizeAdmissionPrefix(raw: string, slugFallback: string): string {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  if (cleaned) return cleaned;
  return admissionNoPrefixFromSlug(slugFallback);
}

export function sanitizeAdmissionSeparator(raw: string): string {
  const s = raw.trim().slice(0, 3);
  if (!s) return "-";
  if (/^[-_./]+$/.test(s)) return s;
  return "-";
}

export function clampSeqDigits(n: number): number {
  if (!Number.isFinite(n)) return 4;
  return Math.min(6, Math.max(3, Math.round(n)));
}

export function clampSeqStart(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(999999, Math.max(1, Math.round(n)));
}

export function normalizeYearSource(raw: string | null | undefined): AdmissionYearSource {
  const v = (raw ?? "calendar").trim().toLowerCase();
  if (v === "academic" || v === "none" || v === "calendar") return v;
  return "calendar";
}

export function academicYearToken(label: string, calendarFallback: number): string {
  const m = label.match(/(20\d{2}|19\d{2})/);
  if (m?.[1]) return m[1];
  return String(calendarFallback);
}

export function resolveYearToken(
  cfg: Pick<AdmissionFormatConfig, "includeYear" | "yearSource" | "academicYearLabel">,
): string | null {
  if (!cfg.includeYear || cfg.yearSource === "none") return null;
  const calendar = new Date().getFullYear();
  if (cfg.yearSource === "academic") {
    return academicYearToken(cfg.academicYearLabel, calendar);
  }
  return String(calendar);
}

export function formatAdmissionNoParts(
  prefix: string,
  yearToken: string | null,
  seq: number,
  seqDigits: number,
  separator: string,
): string {
  const padded = String(seq).padStart(seqDigits, "0");
  if (yearToken) return `${prefix}${separator}${yearToken}${separator}${padded}`;
  return `${prefix}${separator}${padded}`;
}

export function formatAdmissionNo(prefix: string, year: number, seq: number): string {
  return formatAdmissionNoParts(prefix, String(year), seq, 4, "-");
}

export function admissionStem(prefix: string, yearToken: string | null, separator: string): string {
  if (yearToken) return `${prefix}${separator}${yearToken}${separator}`;
  return `${prefix}${separator}`;
}

export function parseAdmissionSequence(
  admissionNo: string,
  stem: string,
  _prefix: string,
  _separator: string,
): number | null {
  const raw = admissionNo.trim().toUpperCase();
  if (!raw) return null;
  const stemU = stem.toUpperCase();
  if (!raw.startsWith(stemU)) return null;
  const rest = raw.slice(stemU.length);
  const n = Number.parseInt(rest.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function orgToAdmissionFormatConfig(org: {
  slug: string;
  admissionFormatConfigured?: boolean | null;
  admissionPrefix?: string | null;
  admissionIncludeYear?: boolean | null;
  admissionYearSource?: string | null;
  admissionSeqDigits?: number | null;
  admissionSeparator?: string | null;
  admissionSeqStart?: number | null;
  currentAcademicYearLabel?: string | null;
}): AdmissionFormatConfig {
  return {
    configured: Boolean(org.admissionFormatConfigured),
    prefix: sanitizeAdmissionPrefix(org.admissionPrefix ?? "", org.slug),
    includeYear: org.admissionIncludeYear !== false,
    yearSource: normalizeYearSource(org.admissionYearSource),
    seqDigits: clampSeqDigits(org.admissionSeqDigits ?? 4),
    separator: sanitizeAdmissionSeparator(org.admissionSeparator ?? "-"),
    seqStart: clampSeqStart(org.admissionSeqStart ?? 1),
    academicYearLabel: org.currentAcademicYearLabel?.trim() ?? "",
    slug: org.slug,
  };
}

export function previewAdmissionFormat(cfg: AdmissionFormatConfig, sampleSeq = 42): AdmissionFormatPreview {
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

export function studentCardPath(studentId: string): string {
  return `/student/card/${encodeURIComponent(studentId)}`;
}

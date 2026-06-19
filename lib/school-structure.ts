import type { SchoolLevelKind } from "@prisma/client";

export const SCHOOL_LEVEL_LABELS: Record<SchoolLevelKind, string> = {
  nursery: "Nursery",
  primary: "Primary",
  secondary: "Secondary",
  a_level: "A-Level",
};

/** Programme code derived from class + stream (e.g. P7-STREAM). */
export function buildProgrammeCodeFromClassStream(classCode: string, streamCode: string): string {
  const c = classCode.trim().toUpperCase().replace(/\s+/g, "-");
  const s = streamCode.trim().toUpperCase().replace(/\s+/g, "-");
  return `${c}-${s}`;
}

export function buildProgrammeNameFromClassStream(className: string, streamName: string): string {
  return `${className.trim()} · ${streamName.trim()}`;
}

export function normalizeSchoolCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 32);
}

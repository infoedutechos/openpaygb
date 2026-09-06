import type { InstitutionTier } from "@prisma/client";

/** URL / UI segment on `/admin/register`. */
export type RegistrationSegment = "higher" | "schools";

export const REGISTRATION_SEGMENTS: RegistrationSegment[] = ["higher", "schools"];

export function isRegistrationSegment(raw: string | null | undefined): raw is RegistrationSegment {
  return raw === "higher" || raw === "schools";
}

export function segmentToInstitutionTier(segment: RegistrationSegment): InstitutionTier {
  return segment === "schools" ? "school" : "university";
}

export function institutionTierFromSegmentParam(
  raw: string | null | undefined,
): InstitutionTier | null {
  if (!isRegistrationSegment(raw)) return null;
  return segmentToInstitutionTier(raw);
}

export function registrationSegmentFromTier(tier: InstitutionTier): RegistrationSegment {
  return tier === "school" ? "schools" : "higher";
}

export function registrationSegmentTitle(segment: RegistrationSegment): string {
  return segment === "higher"
    ? "OdelPay — Higher"
    : "OdelPay — Schools";
}

export function registrationSegmentSubtitle(segment: RegistrationSegment): string {
  return segment === "higher"
    ? "Universities, polytechnics, tertiary"
    : "Primary / secondary schools";
}

export function registrationSegmentCta(segment: RegistrationSegment): string {
  return segment === "higher"
    ? "Request school workspace for higher institutions"
    : "Request school workspace for primary / secondary schools";
}

export function institutionTierLabel(tier: InstitutionTier): string {
  return tier === "school" ? "School (K–12)" : "Higher institution";
}

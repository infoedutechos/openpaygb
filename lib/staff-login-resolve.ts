import type { InstitutionTier } from "@prisma/client";
import { SchoolStaffStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Simple similarity 0–1 (1 = identical). */
export function stringSimilarity(a: string, b: string): number {
  const x = normalizeKey(a);
  const y = normalizeKey(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  const longer = x.length >= y.length ? x : y;
  const shorter = x.length >= y.length ? y : x;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i]!)) matches += 1;
  }
  // Dice-ish on unique chars is weak; use contiguous overlap
  let best = 0;
  for (let len = shorter.length; len >= 3; len--) {
    for (let i = 0; i <= shorter.length - len; i++) {
      const slice = shorter.slice(i, i + len);
      if (longer.includes(slice)) {
        best = Math.max(best, len / longer.length);
      }
    }
    if (best > 0) break;
  }
  return Math.max(best, matches / (longer.length * 2));
}

export type StaffOrgMatch = {
  staffId: string;
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  institutionTier: InstitutionTier;
  staffCode: string;
  name: string;
  portalPasswordHash: string | null;
  status: SchoolStaffStatus;
  lastLoginAt: Date | null;
};

/** Find active staff rows by Staff ID, optionally limited to institution tier. */
export async function findStaffByCodeAcrossOrgs(opts: {
  staffCode: string;
  institutionTier?: InstitutionTier | null;
}): Promise<StaffOrgMatch[]> {
  const staffCode = opts.staffCode.trim().toUpperCase();
  if (!staffCode) return [];

  const rows = await prisma.schoolStaff.findMany({
    where: {
      staffCode,
      status: SchoolStaffStatus.active,
      ...(opts.institutionTier
        ? { organization: { institutionTier: opts.institutionTier, tenantStatus: "active" } }
        : { organization: { tenantStatus: "active" } }),
    },
    select: {
      id: true,
      staffCode: true,
      name: true,
      portalPasswordHash: true,
      status: true,
      lastLoginAt: true,
      organizationId: true,
      organization: {
        select: { id: true, slug: true, name: true, institutionTier: true },
      },
    },
    take: 20,
  });

  return rows.map((r) => ({
    staffId: r.id,
    organizationId: r.organizationId,
    organizationSlug: r.organization.slug,
    organizationName: r.organization.name,
    institutionTier: r.organization.institutionTier,
    staffCode: r.staffCode,
    name: r.name,
    portalPasswordHash: r.portalPasswordHash,
    status: r.status,
    lastLoginAt: r.lastLoginAt,
  }));
}

/**
 * Pick the best org for a Staff ID when the typed school name/slug may be wrong.
 * Prefer exact slug → high name similarity → unique Staff ID match.
 */
export function pickStaffOrgMatch(
  matches: StaffOrgMatch[],
  orgHint: string | null | undefined,
): StaffOrgMatch | null {
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;

  const hint = (orgHint ?? "").trim();
  if (!hint) return null;

  const hintSlug = hint.toLowerCase();
  const bySlug = matches.find((m) => m.organizationSlug === hintSlug);
  if (bySlug) return bySlug;

  let best: StaffOrgMatch | null = null;
  let bestScore = 0;
  for (const m of matches) {
    const score = Math.max(
      stringSimilarity(hint, m.organizationSlug),
      stringSimilarity(hint, m.organizationName),
    );
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  // Require reasonable similarity when Staff ID is not unique
  if (best && bestScore >= 0.45) return best;
  return null;
}

import { describe, expect, it } from "vitest";
import { pickStaffOrgMatch, stringSimilarity } from "@/lib/staff-login-resolve";
import type { StaffOrgMatch } from "@/lib/staff-login-resolve";

function row(partial: Partial<StaffOrgMatch> & Pick<StaffOrgMatch, "organizationSlug" | "organizationName">): StaffOrgMatch {
  return {
    staffId: "s1",
    organizationId: "o1",
    institutionTier: "school",
    staffCode: "STF-1",
    name: "Teacher",
    portalPasswordHash: "x",
    status: "active",
    lastLoginAt: null,
    ...partial,
  };
}

describe("staff-login-resolve", () => {
  it("scores similar school names", () => {
    expect(stringSimilarity("Uwais Quran", "Uwais Qur'an Memorisation")).toBeGreaterThan(0.4);
    expect(stringSimilarity("kyotera-central", "Kyotera Central")).toBeGreaterThan(0.7);
  });

  it("picks unique match without hint", () => {
    const matches = [row({ organizationSlug: "uwais", organizationName: "Uwais" })];
    // pickStaffOrgMatch returns null without hint when... wait, length===1 returns first
    expect(pickStaffOrgMatch(matches, "")?.organizationSlug).toBe("uwais");
  });

  it("picks by fuzzy name when Staff ID is shared", () => {
    const matches = [
      row({
        staffId: "a",
        organizationId: "1",
        organizationSlug: "kampala-campus",
        organizationName: "Kampala Campus",
      }),
      row({
        staffId: "b",
        organizationId: "2",
        organizationSlug: "uwais",
        organizationName: "Uwais Qur'an Memorisation & Junior School",
      }),
    ];
    expect(pickStaffOrgMatch(matches, "uwais quran")?.organizationSlug).toBe("uwais");
    expect(pickStaffOrgMatch(matches, "kampala")?.organizationSlug).toBe("kampala-campus");
  });
});

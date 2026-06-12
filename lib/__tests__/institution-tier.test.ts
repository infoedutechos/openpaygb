import { describe, expect, it } from "vitest";
import {
  institutionTierFromSegmentParam,
  registrationSegmentTitle,
  segmentToInstitutionTier,
} from "@/lib/institution-tier";

describe("institution-tier", () => {
  it("maps registration segments to prisma tiers", () => {
    expect(segmentToInstitutionTier("higher")).toBe("university");
    expect(segmentToInstitutionTier("schools")).toBe("school");
    expect(institutionTierFromSegmentParam("higher")).toBe("university");
    expect(institutionTierFromSegmentParam("schools")).toBe("school");
    expect(institutionTierFromSegmentParam(null)).toBeNull();
  });

  it("labels product lines for register UI", () => {
    expect(registrationSegmentTitle("higher")).toContain("Higher Institutions");
    expect(registrationSegmentTitle("schools")).toContain("Schools");
  });
});

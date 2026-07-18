import { describe, expect, it } from "vitest";
import {
  AUDIENCE_GUIDE_LIST,
  adminGuideForTier,
  audienceGuideFooterLinks,
  studentGuidesForPortal,
} from "@/lib/audience-guides";

describe("audience-guides", () => {
  it("exposes four handbooks", () => {
    expect(AUDIENCE_GUIDE_LIST).toHaveLength(4);
    expect(AUDIENCE_GUIDE_LIST.map((g) => g.helpHref)).toEqual([
      "/help/guide-student-schools",
      "/help/guide-student-higher",
      "/help/guide-admin-schools",
      "/help/guide-admin-higher",
    ]);
  });

  it("picks admin guide by institution tier", () => {
    expect(adminGuideForTier("school").id).toBe("admin_schools");
    expect(adminGuideForTier("university").id).toBe("admin_higher");
  });

  it("lists both student guides for the portal", () => {
    expect(studentGuidesForPortal().map((g) => g.id)).toEqual(["student_schools", "student_higher"]);
  });

  it("builds footer guide links including index", () => {
    const hrefs = audienceGuideFooterLinks().map((l) => l.href);
    expect(hrefs).toContain("/help/guide-admin-schools");
    expect(hrefs).toContain("/api/docs/guides/USER_GUIDE_INDEX.md");
  });
});

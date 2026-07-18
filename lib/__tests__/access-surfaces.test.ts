import { describe, expect, it } from "vitest";
import {
  DEVELOPER_FACING_PATH_PREFIXES,
  ODELHUB_DEVS_ALLOWED_PATH_PREFIXES,
  OPERATOR_ALL_SIDES_LINKS,
  USER_FACING_PATH_PREFIXES,
  isDeveloperFacingPath,
  isUserFacingPath,
} from "@/lib/access-surfaces";
import { STANDALONE_APPS } from "@/lib/standalone-apps";

describe("access-surfaces", () => {
  it("keeps user and developer path families distinct", () => {
    expect(USER_FACING_PATH_PREFIXES).toContain("/student");
    expect(USER_FACING_PATH_PREFIXES).toContain("/staff");
    expect(DEVELOPER_FACING_PATH_PREFIXES).toContain("/developers");
    expect(isUserFacingPath("/student/login")).toBe(true);
    expect(isDeveloperFacingPath("/developers/dashboard")).toBe(true);
    expect(isDeveloperFacingPath("/student")).toBe(false);
  });

  it("lists operator links covering every major side", () => {
    const hrefs = OPERATOR_ALL_SIDES_LINKS.map((l) => l.href);
    expect(hrefs).toContain("/login");
    expect(hrefs).toContain("/student/login");
    expect(hrefs).toContain("/staff/login");
    expect(hrefs).toContain("/admin/login");
    expect(hrefs).toContain("/developers");
    expect(hrefs).toContain("/admin/login?master=1");
  });

  it("lets odelhub_devs standalone face all sides", () => {
    const devs = STANDALONE_APPS.find((a) => a.id === "odelhub_devs");
    expect(devs).toBeTruthy();
    for (const p of ODELHUB_DEVS_ALLOWED_PATH_PREFIXES) {
      if (p === "/api/docs") continue;
      expect(devs!.allowedPathPrefixes).toContain(p);
    }
  });

  it("lets school and university hosts reach student/staff login", () => {
    for (const id of ["odelpay_schools", "odelpay_universities"] as const) {
      const app = STANDALONE_APPS.find((a) => a.id === id)!;
      expect(app.allowedPathPrefixes).toEqual(expect.arrayContaining(["/login", "/student", "/staff", "/my"]));
    }
  });
});

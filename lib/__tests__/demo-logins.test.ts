import { describe, expect, it } from "vitest";
import {
  DEMO_LOGIN_SLOT_KEYS,
  DEMO_LOGIN_SLOT_META,
  defaultDemoLoginDirectory,
} from "@/lib/demo-logins-shared";

describe("demo-logins", () => {
  it("defines five canonical demo slots with defaults", () => {
    expect(DEMO_LOGIN_SLOT_KEYS).toHaveLength(5);
    const directory = defaultDemoLoginDirectory();
    expect(directory.master.email).toBe("master@odelhub.local");
    expect(directory.university_admin.email).toBe("admin@odelhub.local");
    expect(directory.university_student.email).toBe("student@odelhub.local");
    expect(directory.school_admin.email).toBe("school.admin@odelhub.local");
    expect(directory.school_student.email).toBe("school.student@odelhub.local");
  });

  it("maps each slot to a login path and org slug", () => {
    expect(DEMO_LOGIN_SLOT_META.master.loginPath).toContain("master=1");
    expect(DEMO_LOGIN_SLOT_META.university_admin.orgSlug).toBe("default");
    expect(DEMO_LOGIN_SLOT_META.school_student.orgSlug).toBe("riverside-demo");
    expect(DEMO_LOGIN_SLOT_META.school_admin.kind).toBe("admin");
    expect(DEMO_LOGIN_SLOT_META.university_student.kind).toBe("student");
  });
});

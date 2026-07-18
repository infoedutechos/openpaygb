import { describe, expect, it } from "vitest";
import {
  DEMO_LOGIN_SLOT_KEYS,
  DEMO_LOGIN_SLOT_META,
  csvEscape,
  defaultDemoLoginDirectory,
  resolveDemoLoginMeta,
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
    expect(directory.master.publishPublic).toBe(false);
    expect(directory.school_admin.publishPublic).toBe(true);
    expect(directory.university_student.publishPublic).toBe(true);
  });

  it("maps each slot to a login path, org slug, and audience", () => {
    expect(DEMO_LOGIN_SLOT_META.master.loginPath).toContain("master=1");
    expect(DEMO_LOGIN_SLOT_META.university_admin.orgSlug).toBe("default");
    expect(DEMO_LOGIN_SLOT_META.school_student.orgSlug).toBe("riverside-demo");
    expect(DEMO_LOGIN_SLOT_META.school_admin.kind).toBe("admin");
    expect(DEMO_LOGIN_SLOT_META.university_student.kind).toBe("student");
    expect(DEMO_LOGIN_SLOT_META.school_admin.audience).toBe("school");
    expect(DEMO_LOGIN_SLOT_META.university_admin.audience).toBe("university");
  });

  it("resolves customisable label, org, path, and publish flags", () => {
    const stored = {
      email: "custom@odelhub.local",
      name: "Custom",
      label: "Custom school admin",
      orgSlug: "riverside-demo",
      loginPath: "/admin/login?school=1",
      publishPublic: false,
      publicPasswordHint: "DemoPass_123!",
    };
    const resolved = resolveDemoLoginMeta("school_admin", stored);
    expect(resolved.label).toBe("Custom school admin");
    expect(resolved.orgSlug).toBe("riverside-demo");
    expect(resolved.loginPath).toBe("/admin/login?school=1");
    expect(resolved.publishPublic).toBe(false);
  });

  it("csv-escapes fields with commas and quotes", () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });
});

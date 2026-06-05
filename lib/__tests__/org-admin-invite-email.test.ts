import { describe, expect, it } from "vitest";
import {
  buildOrgAdminInviteEmailHtml,
  buildOrgAdminInviteEmailText,
} from "@/lib/org-admin-invite-email";

describe("org-admin-invite-email", () => {
  const details = {
    adminEmail: "admin@school.ug",
    schoolName: "Kampala Campus",
    schoolSlug: "kampala-campus",
    resetUrl: "http://localhost:3000/admin/reset-password?token=abc",
  };

  it("includes school and reset link in html", () => {
    const html = buildOrgAdminInviteEmailHtml(details, "http://localhost:3000/school/login");
    expect(html).toContain("Kampala Campus");
    expect(html).toContain("kampala-campus");
    expect(html).toContain("admin@school.ug");
    expect(html).toContain("reset-password?token=abc");
    expect(html).not.toContain("TempPass");
    expect(html).toContain("ODEL HUB");
  });

  it("includes school and credentials in plain text", () => {
    const text = buildOrgAdminInviteEmailText(details, "http://localhost:3000/school/login");
    expect(text).toContain("kampala-campus");
    expect(text).toContain("/school/login");
  });
});

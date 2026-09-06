import { describe, expect, it } from "vitest";
import {
  buildWorkspaceRegistrationEmailHtml,
  buildWorkspaceRegistrationEmailText,
} from "@/lib/organization-registration-email-content";

describe("organization-registration-email", () => {
  it("includes registration details in html", { timeout: 30_000 }, () => {
    const html = buildWorkspaceRegistrationEmailHtml(
      {
        schoolName: "Test School",
        slug: "test-school",
        contactEmail: "admin@test.edu",
        note: "Please enable TON",
        registeredAt: new Date("2026-05-23T12:00:00.000Z"),
      },
      "http://localhost:3000/api/public/organization-register/verify?token=abc",
    );
    expect(html).toContain("Test School");
    expect(html).toContain("test-school");
    expect(html).toContain("admin@test.edu");
    expect(html).toContain("Please enable TON");
    expect(html).toContain("ODELPay HUB");
  });

  it("includes registration details in plain text", () => {
    const text = buildWorkspaceRegistrationEmailText(
      {
        schoolName: "Test School",
        slug: "test-school",
        contactEmail: "admin@test.edu",
        note: "",
        registeredAt: new Date("2026-05-23T12:00:00.000Z"),
      },
      "http://localhost:3000/verify",
    );
    expect(text).toContain("Test School");
    expect(text).toContain("test-school");
  });
});

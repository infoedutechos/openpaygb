import { describe, expect, it } from "vitest";
import { PUBLIC_SCHOOL_LOGIN_PATH } from "@/lib/admin-auth-entry";
import { normalizeRegistrationContactEmail } from "@/lib/organization-intake";
import {
  canMasterApproveWorkspace,
  workspaceEmailVerificationRequired,
  workspaceEmailVerifyStatus,
} from "@/lib/organization-workspace-verify";
import { WORKSPACE_VERIFY_FAIL_MESSAGES } from "@/lib/organization-workspace-verify";

describe("organization-intake", () => {
  it("normalizes registration contact email", () => {
    expect(normalizeRegistrationContactEmail("  Admin@School.edu  ")).toBe("admin@school.edu");
    expect(normalizeRegistrationContactEmail("")).toBe("");
  });
});

describe("organization-workspace-verify", () => {
  it("uses public school login path for post-verify redirect", () => {
    expect(PUBLIC_SCHOOL_LOGIN_PATH).toBe("/school/login");
  });

  it("expired verify message points to resend", () => {
    expect(WORKSPACE_VERIFY_FAIL_MESSAGES.expired).toMatch(/Resend verification/i);
  });
  it("requires verification when contact email exists but not verified", () => {
    expect(
      workspaceEmailVerificationRequired({
        registrationContactEmail: "school@example.com",
        registrationEmailVerifiedAt: null,
      }),
    ).toBe(true);
    expect(
      canMasterApproveWorkspace({
        registrationContactEmail: "school@example.com",
        registrationEmailVerifiedAt: null,
      }),
    ).toBe(true);
    expect(
      workspaceEmailVerifyStatus({
        registrationContactEmail: "school@example.com",
        registrationEmailVerifiedAt: null,
      }),
    ).toBe("pending");
  });

  it("allows approval when verified or no email", () => {
    expect(
      canMasterApproveWorkspace({
        registrationContactEmail: "school@example.com",
        registrationEmailVerifiedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      canMasterApproveWorkspace({
        registrationContactEmail: "",
        registrationEmailVerifiedAt: null,
      }),
    ).toBe(true);
    expect(
      workspaceEmailVerifyStatus({
        registrationContactEmail: "",
        registrationEmailVerifiedAt: null,
      }),
    ).toBe("none");
  });
});

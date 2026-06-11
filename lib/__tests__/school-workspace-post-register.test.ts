import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/org-activate-pending", () => ({
  activatePendingOrganizationWorkspace: vi.fn(),
}));

import { activatePendingOrganizationWorkspace } from "@/lib/org-activate-pending";
import { completeDeferredSchoolWorkspaceRegistration } from "@/lib/school-workspace-post-register";

describe("completeDeferredSchoolWorkspaceRegistration", () => {
  beforeEach(() => {
    vi.mocked(activatePendingOrganizationWorkspace).mockReset();
    vi.mocked(activatePendingOrganizationWorkspace).mockResolvedValue({} as never);
  });

  it("activates and redirects when auto-registration is enabled", async () => {
    const result = await completeDeferredSchoolWorkspaceRegistration("org1", "kampala", "a@school.ug", {
      requireMasterApproval: false,
      autoRegistrationEnabled: true,
      autoGenerateAdminLogin: true,
      deferEmailVerification: true,
      autoRedirectAfterRegister: true,
    });
    expect(activatePendingOrganizationWorkspace).toHaveBeenCalledWith("org1");
    expect(result.activated).toBe(true);
    expect(result.redirectUrl).toContain("/school/workspace-status");
    expect(result.redirectUrl).toContain("slug=kampala");
    expect(result.redirectUrl).toContain("submitted=1");
    expect(result.redirectUrl).toContain("activated=1");
    expect(result.message).toContain("password-set link");
  });

  it("skips activation when master approval is required", async () => {
    const result = await completeDeferredSchoolWorkspaceRegistration("org1", "kampala", "a@school.ug", {
      requireMasterApproval: true,
      autoRegistrationEnabled: false,
      autoGenerateAdminLogin: false,
      deferEmailVerification: true,
      autoRedirectAfterRegister: true,
    });
    expect(activatePendingOrganizationWorkspace).not.toHaveBeenCalled();
    expect(result.activated).toBe(false);
    expect(result.redirectUrl).not.toContain("activated=1");
  });
});

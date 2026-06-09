import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteUiSettings: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getSchoolWorkspaceRegistrationPolicy,
  isSchoolWorkspaceAutoAdminLoginEnabled,
  isUnknownSchoolWorkspacePolicyFieldError,
} from "@/lib/school-workspace-registration-policy";

describe("school-workspace-registration-policy", () => {
  beforeEach(() => {
    vi.mocked(prisma.siteUiSettings.findUnique).mockReset();
  });

  it("autoRegistrationEnabled is inverse of requireMasterApproval", async () => {
    vi.mocked(prisma.siteUiSettings.findUnique).mockResolvedValue({
      schoolWorkspaceRequireMasterApproval: true,
    } as never);
    const strict = await getSchoolWorkspaceRegistrationPolicy();
    expect(strict.requireMasterApproval).toBe(true);
    expect(strict.autoRegistrationEnabled).toBe(false);

    vi.mocked(prisma.siteUiSettings.findUnique).mockResolvedValue({
      schoolWorkspaceRequireMasterApproval: false,
    } as never);
    const auto = await getSchoolWorkspaceRegistrationPolicy();
    expect(auto.requireMasterApproval).toBe(false);
    expect(auto.autoRegistrationEnabled).toBe(true);
  });

  it("defaults requireMasterApproval to true when setting row is missing", async () => {
    vi.mocked(prisma.siteUiSettings.findUnique).mockResolvedValue(null);
    const policy = await getSchoolWorkspaceRegistrationPolicy();
    expect(policy.requireMasterApproval).toBe(true);
    expect(policy.autoRegistrationEnabled).toBe(false);
    expect(policy.autoGenerateAdminLogin).toBe(false);
  });

  it("reads autoGenerateAdminLogin from site settings", async () => {
    vi.mocked(prisma.siteUiSettings.findUnique).mockResolvedValue({
      schoolWorkspaceRequireMasterApproval: false,
      schoolWorkspaceAutoGenerateAdminLogin: true,
    } as never);
    const policy = await getSchoolWorkspaceRegistrationPolicy();
    expect(policy.autoGenerateAdminLogin).toBe(true);
    expect(await isSchoolWorkspaceAutoAdminLoginEnabled()).toBe(true);
  });

  it("isUnknownSchoolWorkspacePolicyFieldError detects stale Prisma client", () => {
    const err = {
      name: "PrismaClientValidationError",
      message: "Unknown field schoolWorkspaceRequireMasterApproval",
    };
    expect(isUnknownSchoolWorkspacePolicyFieldError(err)).toBe(true);
    expect(isUnknownSchoolWorkspacePolicyFieldError(new Error("other"))).toBe(false);
  });
});

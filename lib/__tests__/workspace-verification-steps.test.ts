import { describe, expect, it } from "vitest";
import { buildWorkspaceVerificationSteps } from "@/lib/workspace-verification-steps";

describe("buildWorkspaceVerificationSteps", () => {
  it("marks email step pending when not verified", () => {
    const steps = buildWorkspaceVerificationSteps(
      { tenantStatus: "pending", registrationEmailVerifiedAt: null },
      false,
    );
    const email = steps.find((s) => s.id === "email");
    expect(email?.done).toBe(false);
    expect(email?.pending).toBe(true);
  });

  it("skips master review when auto registration is enabled", () => {
    const steps = buildWorkspaceVerificationSteps(
      { tenantStatus: "pending", registrationEmailVerifiedAt: new Date() },
      true,
    );
    const master = steps.find((s) => s.id === "master");
    expect(master?.skipped).toBe(true);
  });

  it("includes rejected step when tenant is rejected", () => {
    const steps = buildWorkspaceVerificationSteps(
      { tenantStatus: "rejected", registrationEmailVerifiedAt: new Date() },
      false,
    );
    expect(steps.some((s) => s.id === "rejected")).toBe(true);
  });
});

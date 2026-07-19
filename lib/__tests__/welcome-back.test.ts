import { describe, expect, it } from "vitest";
import { buildWelcomeBackMessage, formatLoginTimestamp, roleDisplayLabel } from "@/lib/welcome-back";

describe("welcome-back", () => {
  it("labels roles", () => {
    expect(roleDisplayLabel("master")).toBe("Platform master admin");
    expect(roleDisplayLabel("student")).toBe("Student");
  });

  it("first login message", () => {
    const msg = buildWelcomeBackMessage({ name: "Ada", role: "student" });
    expect(msg.headline).toBe("Welcome back, Ada");
    expect(msg.subline).toContain("first sign-in");
  });

  it("returning user message", { timeout: 15_000 }, () => {
    const prev = "2026-01-15T10:00:00.000Z";
    const msg = buildWelcomeBackMessage({
      name: "Ada",
      role: "school_admin",
      previousLoginAt: prev,
    });
    expect(msg.headline).toBe("Welcome back, Ada");
    expect(msg.subline).toContain("Last signed in");
    expect(formatLoginTimestamp(prev)).toBeTruthy();
  });
});

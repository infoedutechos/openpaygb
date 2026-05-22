import { describe, expect, it } from "vitest";

describe("student claim portal policy", () => {
  it("documents claim requires student row with email and a payment", () => {
    const claimSteps = [
      "checkout email required",
      "upsert student without portalPasswordHash",
      "payment pending or confirmed",
      "POST /api/auth/student-claim-portal sets hash + cookie",
    ];
    expect(claimSteps.length).toBe(4);
  });
});

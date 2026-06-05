import { describe, expect, it } from "vitest";
import { isTransientMongoError } from "@/lib/prisma-retry";

describe("prisma-retry", () => {
  it("detects Atlas timeout errors", () => {
    const err = new Error(
      "Server selection timeout: No available servers. connection was forcibly closed (os error 10054)",
    );
    expect(isTransientMongoError(err)).toBe(true);
  });

  it("ignores validation errors", () => {
    expect(isTransientMongoError(new Error("Unknown field checkoutPlatformFeeDefaultKind"))).toBe(false);
  });

  it("detects raw query failed", () => {
    expect(isTransientMongoError(new Error("Raw query failed. Code: unknown"))).toBe(true);
  });
});

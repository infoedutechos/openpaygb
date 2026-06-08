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

  it("detects Windows socket permission and host errors", () => {
    expect(isTransientMongoError(new Error("os error 10013"))).toBe(true);
    expect(isTransientMongoError(new Error("No such host is known. (os error 11001)"))).toBe(true);
  });

  it("detects Windows unreachable network DNS errors", () => {
    expect(
      isTransientMongoError(
        new Error(
          "DNS resolution: proto error: io error: A socket operation was attempted to an unreachable network. (os error 10051)",
        ),
      ),
    ).toBe(true);
  });
});

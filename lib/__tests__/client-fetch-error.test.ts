import { describe, expect, it } from "vitest";
import { isClientFetchNetworkError, clientFetchErrorMessage } from "@/lib/client-fetch-error";

describe("isClientFetchNetworkError", () => {
  it("detects TypeError network error (Next overlay)", () => {
    const err = new TypeError("network error");
    expect(isClientFetchNetworkError(err)).toBe(true);
  });

  it("detects Failed to fetch", () => {
    expect(isClientFetchNetworkError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("detects plain string", () => {
    expect(isClientFetchNetworkError("network error")).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isClientFetchNetworkError(new Error("Invalid client credentials"))).toBe(false);
  });

  it("returns restart hint for network failures", () => {
    expect(clientFetchErrorMessage(new TypeError("network error"))).toMatch(/dev server/i);
  });
});

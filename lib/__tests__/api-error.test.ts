import { describe, expect, it, afterEach, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { resolveApiError, sanitizeClientMessage } from "@/lib/api-error";

describe("api-error", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sanitizes prisma connection leaks", () => {
    expect(sanitizeClientMessage("Invalid `prisma.payment.findUnique()` invocation")).toBe(
      "Request could not be completed",
    );
  });

  it("maps P2002 to 409", () => {
    const err = new Prisma.PrismaClientKnownRequestError("Unique", {
      code: "P2002",
      clientVersion: "test",
    });
    const r = resolveApiError(err, { route: "test" });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/already exists/i);
  });

  it("maps business not-found messages to 404", () => {
    const r = resolveApiError(new Error("Organization not found"), { route: "test" });
    expect(r.status).toBe(404);
  });

  it("hides raw 500 messages in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    const r = resolveApiError(new Error("secret internal stack at lib/foo.ts:12"), {
      route: "test",
      fallback: "Server error",
    });
    expect(r.status).toBe(500);
    expect(r.body.error).toBe("Server error");
    expect(r.shouldLog).toBe(true);
  });

  it("maps LivePay IP allowlist to 502", () => {
    const r = resolveApiError(new Error("IP 41.75.191.198 not allowed"), { route: "test" });
    expect(r.status).toBe(502);
  });

  it("maps transient Mongo to 503", () => {
    const r = resolveApiError(new Error("Server selection timeout: No available servers"), {
      route: "test",
    });
    expect(r.status).toBe(503);
    expect(r.body.code).toBe("DB_UNAVAILABLE");
  });

  it("shows safe 4xx business errors in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    const r = resolveApiError(new Error("Programme not found"), { route: "test" });
    expect(r.status).toBe(404);
    expect(r.body.error).toMatch(/programme not found/i);
  });
});

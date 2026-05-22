import { describe, expect, it, afterEach, vi } from "vitest";
import { isProductionRuntime, requireConfiguredSecret, requireCronAuth } from "@/lib/production-secrets";

describe("production-secrets", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("isProductionRuntime when NODE_ENV=production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");
    expect(isProductionRuntime()).toBe(true);
  });

  it("requireConfiguredSecret fails in production when missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    const r = requireConfiguredSecret("TEST_SECRET", undefined);
    expect(r.ok).toBe(false);
  });

  it("requireCronAuth rejects bad bearer in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    const req = new Request("http://localhost", { headers: { authorization: "Bearer wrong" } });
    const r = requireCronAuth(req);
    expect(r.ok).toBe(false);
  });
});

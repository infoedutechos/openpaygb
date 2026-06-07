import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { getDeploymentEnvStatus } from "@/lib/deployment-env-status";

vi.mock("@/lib/deployment-env-resolve", () => ({
  warmDeploymentEnvCache: vi.fn().mockResolvedValue(undefined),
  deploymentEnv: (name: string) => process.env[name]?.trim() ?? "",
}));

vi.mock("@/lib/deployment-env-overrides", () => ({
  listDeploymentEnvOverrideNames: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/deployment-env-custom-registry", () => ({
  listCustomRegistryEntries: vi.fn().mockResolvedValue([]),
}));

describe("getDeploymentEnvStatus", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns grouped env audit without exposing full secrets", async () => {
    process.env.DATABASE_URL = "mongodb://local/test";
    process.env.JWT_SECRET = "test-jwt-secret-min-16";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.LIVEPAY_API_KEY = "supersecretlivepaykey";
    process.env.LIVEPAY_ACCOUNT_NUMBER = "LP123";

    const status = await getDeploymentEnvStatus();
    expect(status.groups.length).toBeGreaterThan(5);
    expect(status.summary.setVars).toBeGreaterThan(0);

    const livepay = status.groups.find((g) => g.id === "livepay");
    expect(livepay?.configured).toBe(true);
    const apiKey = livepay?.vars.find((v) => v.name === "LIVEPAY_API_KEY");
    expect(apiKey?.set).toBe(true);
    expect(apiKey?.source).toBe("process");
    expect(apiKey?.maskedPreview).not.toBe("supersecretlivepaykey");
    expect(apiKey?.maskedPreview).toContain("…");
  });

  it("flags production-required gaps when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");

    const status = await getDeploymentEnvStatus();
    expect(status.summary.production).toBe(true);
    expect(status.summary.missingProduction).toBeGreaterThan(0);

    const ton = status.groups.find((g) => g.id === "ton");
    const cron = ton?.vars.find((v) => v.name === "CRON_SECRET");
    expect(cron?.missingInProduction).toBe(true);
  });
});

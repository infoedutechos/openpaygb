import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadMap = vi.fn();

vi.mock("@/lib/deployment-env-overrides", () => ({
  loadDeploymentEnvOverrideMap: () => loadMap(),
}));

describe("deployment-env-resolve TTL", () => {
  beforeEach(() => {
    vi.resetModules();
    loadMap.mockReset();
    loadMap.mockResolvedValue(new Map([["LIVEPAY_API_KEY", "from-mac"]]));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reloads overrides after TTL so MAC saves apply without redeploy", async () => {
    vi.useFakeTimers();
    const mod = await import("@/lib/deployment-env-resolve");
    await mod.warmDeploymentEnvCache();
    expect(mod.deploymentEnv("LIVEPAY_API_KEY")).toBe("from-mac");
    expect(loadMap).toHaveBeenCalledTimes(1);

    loadMap.mockResolvedValue(new Map([["LIVEPAY_API_KEY", "updated-mac"]]));
    await mod.warmDeploymentEnvCache();
    expect(loadMap).toHaveBeenCalledTimes(1); // still fresh

    vi.advanceTimersByTime(mod.DEPLOYMENT_ENV_CACHE_TTL_MS + 1);
    await mod.warmDeploymentEnvCache();
    expect(loadMap).toHaveBeenCalledTimes(2);
    expect(mod.deploymentEnv("LIVEPAY_API_KEY")).toBe("updated-mac");
  });

  it("force warm reloads immediately", async () => {
    const mod = await import("@/lib/deployment-env-resolve");
    await mod.warmDeploymentEnvCache();
    loadMap.mockResolvedValue(new Map([["LIVEPAY_API_KEY", "forced"]]));
    await mod.warmDeploymentEnvCache({ force: true });
    expect(mod.deploymentEnv("LIVEPAY_API_KEY")).toBe("forced");
  });
});

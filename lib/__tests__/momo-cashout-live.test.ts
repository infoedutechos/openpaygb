import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/deployment-env-resolve", () => ({
  warmDeploymentEnvCache: vi.fn().mockResolvedValue(undefined),
  deploymentEnv: (name: string) => process.env[name]?.trim() ?? "",
}));

import { momoCashoutLiveEnabled } from "@/lib/momo-disburse";

describe("momoCashoutLiveEnabled", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.OPENPAYGB_CASHOUT_LIVE;
    delete process.env.OPENPAYGB_CASHOUT_RAIL;
    delete process.env.LIVEPAY_API_KEY;
    delete process.env.LIVEPAY_ACCOUNT_NUMBER;
    delete process.env.RELWORX_API_KEY;
    delete process.env.RELWORX_ACCOUNT_NO;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("forces queue-only when OPENPAYGB_CASHOUT_LIVE=0", () => {
    process.env.OPENPAYGB_CASHOUT_LIVE = "0";
    process.env.LIVEPAY_API_KEY = "test-key";
    process.env.LIVEPAY_ACCOUNT_NUMBER = "123";
    expect(momoCashoutLiveEnabled()).toBe(false);
  });

  it("auto-enables when LivePay is configured and flag unset", () => {
    process.env.LIVEPAY_API_KEY = "test-key";
    process.env.LIVEPAY_ACCOUNT_NUMBER = "123";
    expect(momoCashoutLiveEnabled()).toBe(true);
  });
});

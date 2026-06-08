import { describe, expect, it } from "vitest";
import { discoverEnvVarNamesFromCodebase } from "@/lib/deployment-env-autodiscover";

describe("deployment-env-autodiscover", () => {
  it("discovers known env names referenced in the codebase", { timeout: 30_000 }, () => {
    const names = discoverEnvVarNamesFromCodebase();
    expect(names.has("BREVO_API_KEY")).toBe(true);
    expect(names.has("TELEGRAM_ORG_SLUG")).toBe(true);
    expect(names.has("VERCEL_ACCESS_TOKEN")).toBe(true);
  });

  it("does not include common Node builtins", { timeout: 30_000 }, () => {
    const names = discoverEnvVarNamesFromCodebase();
    expect(names.has("PATH")).toBe(false);
    expect(names.has("NODE_ENV")).toBe(false);
  });
});

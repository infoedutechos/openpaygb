import { describe, expect, it } from "vitest";
import {
  normalizeCustomEnvVarName,
  validateCustomEnvVarName,
} from "@/lib/deployment-env-custom-registry";

describe("deployment-env-custom-registry", () => {
  it("normalizes env names to UPPER_SNAKE_CASE", () => {
    expect(normalizeCustomEnvVarName(" my-api-key ")).toBe("MY_API_KEY");
  });

  it("rejects built-in registry duplicates", () => {
    expect(validateCustomEnvVarName("DATABASE_URL")).toMatch(/built-in/i);
  });

  it("accepts new custom names", () => {
    expect(validateCustomEnvVarName("MY_PARTNER_WEBHOOK_SECRET")).toBeNull();
  });
});

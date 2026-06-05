import { describe, expect, it } from "vitest";
import {
  decryptDeploymentEnvValue,
  encryptDeploymentEnvValue,
} from "@/lib/deployment-env-crypto";

describe("deployment-env-crypto", () => {
  it("round-trips encrypted values", () => {
    const plain = "RELWORX_API_KEY_test_value_12345";
    const enc = encryptDeploymentEnvValue(plain);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decryptDeploymentEnvValue(enc)).toBe(plain);
  });
});

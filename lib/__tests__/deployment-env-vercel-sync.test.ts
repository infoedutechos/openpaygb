import { describe, expect, it } from "vitest";
import { vercelTargetsForRequirement } from "@/lib/deployment-env-vercel-sync";

describe("deployment-env-vercel-sync", () => {
  it("maps requirement all to every Vercel target", () => {
    expect(vercelTargetsForRequirement("all")).toEqual(["production", "preview", "development"]);
  });

  it("maps production requirement to production only", () => {
    expect(vercelTargetsForRequirement("production")).toEqual(["production"]);
  });

  it("maps always to production and preview", () => {
    expect(vercelTargetsForRequirement("always")).toEqual(["production", "preview"]);
  });
});

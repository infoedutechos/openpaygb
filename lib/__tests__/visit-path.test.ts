import { describe, expect, it } from "vitest";
import { normalizeVisitAction, normalizeVisitPath } from "@/lib/visit-path";

describe("normalizeVisitPath", () => {
  it("normalizes empty and root", () => {
    expect(normalizeVisitPath("")).toBe("/");
    expect(normalizeVisitPath("/")).toBe("/");
  });

  it("collapses ObjectIds and UUIDs", () => {
    expect(normalizeVisitPath("/student/card/507f1f77bcf86cd799439011")).toBe("/student/card/:id");
    expect(normalizeVisitPath("/x/550e8400-e29b-41d4-a716-446655440000")).toBe("/x/:id");
  });

  it("strips query and hash", () => {
    expect(normalizeVisitPath("/pay/default?hub=1#top")).toBe("/pay/default");
  });
});

describe("normalizeVisitAction", () => {
  it("trims and caps length", () => {
    expect(normalizeVisitAction("  Click me  ")).toBe("Click me");
    expect(normalizeVisitAction("")).toBe("unknown");
  });
});

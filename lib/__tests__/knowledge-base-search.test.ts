import { describe, it, expect } from "vitest";
import { tokenizeQuery, excerptFromBody } from "@/lib/knowledge-base/tokenize";
import { hubToAudiences } from "@/lib/knowledge-base/types";
import { platformHubFromPathname, platformAssistVisibleOnPath } from "@/lib/platform-hub-from-path";

describe("knowledge-base tokenize", () => {
  it("strips stop words and short tokens", () => {
    expect(tokenizeQuery("How do I pay tuition?")).toEqual(["pay", "tuition"]);
  });

  it("excerpts long body text", () => {
    const long = "a".repeat(400);
    const excerpt = excerptFromBody(long, 100);
    expect(excerpt.length).toBeLessThanOrEqual(101);
    expect(excerpt.endsWith("…")).toBe(true);
  });
});

describe("hubToAudiences", () => {
  it("includes all plus hub-specific audience", () => {
    expect(hubToAudiences("tuition")).toEqual(["all", "tuition"]);
    expect(hubToAudiences("all")).toContain("play");
  });
});

describe("platformHubFromPathname", () => {
  it("maps tuition and admin routes", () => {
    expect(platformHubFromPathname("/pay/demo")).toBe("tuition");
    expect(platformHubFromPathname("/admin/master")).toBe("admin");
    expect(platformHubFromPathname("/clicker")).toBe("play");
  });

  it("hides assist shell on clicker", () => {
    expect(platformAssistVisibleOnPath("/clicker")).toBe(false);
    expect(platformAssistVisibleOnPath("/pay")).toBe(true);
  });
});

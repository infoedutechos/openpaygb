import { describe, expect, it } from "vitest";
import { formatArticleLink } from "@/lib/knowledge-base/article-paths";

describe("copilot reply formatting", () => {
  it("formats article titles as markdown links", () => {
    const link = formatArticleLink("Pay tuition as a guest", "tuition-pay-guest");
    expect(link).toMatch(/^\[Pay tuition as a guest\]\(/);
    expect(link).not.toContain("knowledge base");
  });
});

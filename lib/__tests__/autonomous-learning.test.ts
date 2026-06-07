import { describe, expect, it } from "vitest";
import {
  buildAutoLearnedArticle,
  slugFromLearningQuery,
} from "@/lib/knowledge-base/autonomous-learning";

describe("slugFromLearningQuery", () => {
  it("builds stable auto-learned slugs", () => {
    const a = slugFromLearningQuery("how do i pay with momo");
    const b = slugFromLearningQuery("how do i pay with momo");
    expect(a).toMatch(/^auto-/);
    expect(a).toBe(b);
    expect(a.length).toBeLessThanOrEqual(80);
  });
});

describe("buildAutoLearnedArticle", () => {
  it("synthesizes from related hits", () => {
    const draft = buildAutoLearnedArticle({
      query: "How do I top up my virtual card?",
      hub: "tuition",
      related: [
        {
          id: "1",
          slug: "openpay-card-topup",
          title: "Virtual card top-up",
          summary: "Fund with TON or MoMo.",
          body: "Full steps",
          category: "tuition",
          tags: ["card"],
          audience: "tuition",
          published: true,
          sortOrder: 1,
          source: "seed",
          score: 10,
          excerpt: "Fund with TON or MoMo.",
        },
      ],
    });
    expect(draft.title).toContain("virtual card");
    expect(draft.body).toContain("Auto-learned");
    expect(draft.tags).toContain("auto-learned");
    expect(draft.tags).toContain("openpay-card-topup");
  });

  it("creates stub when no related articles", () => {
    const draft = buildAutoLearnedArticle({
      query: "What is the refund policy for cancelled programmes?",
      hub: "admin",
      related: [],
    });
    expect(draft.tags).toContain("needs-review");
    expect(draft.body).toContain("Talk to an agent");
  });
});

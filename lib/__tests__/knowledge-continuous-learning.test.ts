import { describe, expect, it } from "vitest";
import { normalizeLearningQuery } from "@/lib/knowledge-base/normalize-query";

describe("knowledge continuous learning", () => {
  it("normalizes queries for deduplication", () => {
    expect(normalizeLearningQuery("  How do I Pay with MoMo?  ")).toBe("how do i pay with momo");
    expect(normalizeLearningQuery("")).toBe("");
  });

  it("strips punctuation and caps length", () => {
    const long = "a".repeat(300);
    expect(normalizeLearningQuery(long).length).toBeLessThanOrEqual(240);
  });
});

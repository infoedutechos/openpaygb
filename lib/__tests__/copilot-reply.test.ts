import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/knowledge-base/search", () => ({
  searchKnowledgeBase: vi.fn(),
  searchKnowledgeBaseRelaxed: vi.fn(),
}));

vi.mock("@/lib/knowledge-base/autonomous-learning", () => ({
  autonomousLearnFromGap: vi.fn(),
}));

vi.mock("@/utils/support-chat-fallback", () => ({
  getSupportChatFallbackReply: vi.fn((msg: string) => `fallback:${msg}`),
}));

import { searchKnowledgeBase, searchKnowledgeBaseRelaxed } from "@/lib/knowledge-base/search";
import { autonomousLearnFromGap } from "@/lib/knowledge-base/autonomous-learning";
import { composeCopilotReply } from "@/lib/knowledge-base/copilot-reply";

const mockSearch = vi.mocked(searchKnowledgeBase);
const mockRelaxed = vi.mocked(searchKnowledgeBaseRelaxed);
const mockLearn = vi.mocked(autonomousLearnFromGap);

describe("composeCopilotReply", () => {
  beforeEach(() => {
    mockSearch.mockReset();
    mockRelaxed.mockReset();
    mockLearn.mockReset();
    mockRelaxed.mockResolvedValue([]);
    mockLearn.mockResolvedValue(null);
  });

  it("formats knowledge base hits with citations", async () => {
    mockSearch.mockResolvedValue([
      {
        id: "1",
        slug: "tuition-pay-guest",
        title: "Pay tuition as a guest",
        summary: "Guest checkout steps.",
        body: "Open /pay",
        category: "tuition",
        tags: ["pay"],
        audience: "tuition",
        published: true,
        sortOrder: 10,
        source: "seed",
        score: 20,
        excerpt: "Open /pay",
      },
    ]);

    const result = await composeCopilotReply("how to pay tuition", "tuition");
    expect(result.source).toBe("knowledge_base");
    expect(result.citations).toContain("tuition-pay-guest");
    expect(result.reply).toContain("Pay tuition as a guest");
  });

  it("auto-learns when strict search returns no hits", async () => {
    mockSearch.mockResolvedValue([]);
    mockLearn.mockResolvedValue({
      reply: "**Auto topic** — learned answer",
      citations: ["auto-topic-abc123"],
      source: "knowledge_base",
    });

    const result = await composeCopilotReply("how do refunds work for virtual cards", "tuition");
    expect(mockLearn).toHaveBeenCalled();
    expect(result.source).toBe("knowledge_base");
    expect(result.citations).toContain("auto-topic-abc123");
  });

  it("falls back only when auto-learn cannot run", async () => {
    mockSearch.mockResolvedValue([]);
    const result = await composeCopilotReply("hi", "all");
    expect(result.source).toBe("fallback");
    expect(result.reply).toContain("fallback:hi");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/knowledge-base/search", () => ({
  searchKnowledgeBase: vi.fn(),
}));

vi.mock("@/utils/support-chat-fallback", () => ({
  getSupportChatFallbackReply: vi.fn((msg: string) => `fallback:${msg}`),
}));

import { searchKnowledgeBase } from "@/lib/knowledge-base/search";
import { composeCopilotReply } from "@/lib/knowledge-base/copilot-reply";

const mockSearch = vi.mocked(searchKnowledgeBase);

describe("composeCopilotReply", () => {
  beforeEach(() => {
    mockSearch.mockReset();
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

  it("falls back when search returns no hits", async () => {
    mockSearch.mockResolvedValue([]);
    const result = await composeCopilotReply("xyz unknown topic", "all");
    expect(result.source).toBe("fallback");
    expect(result.reply).toContain("fallback:xyz unknown topic");
  });
});

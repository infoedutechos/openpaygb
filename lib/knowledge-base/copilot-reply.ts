import { autonomousLearnFromGap } from "@/lib/knowledge-base/autonomous-learning";
import { searchKnowledgeBase, searchKnowledgeBaseRelaxed } from "@/lib/knowledge-base/search";
import type { PlatformHub } from "@/lib/knowledge-base/types";
import { getSupportChatFallbackReply } from "@/utils/support-chat-fallback";

export type CopilotReply = {
  reply: string;
  citations: string[];
  source: "knowledge_base" | "fallback";
};

function formatKbReply(
  userMessage: string,
  hits: Awaited<ReturnType<typeof searchKnowledgeBase>>,
): CopilotReply | null {
  if (!hits.length) return null;

  const top = hits[0];
  const lines: string[] = [];

  if (hits.length === 1) {
    lines.push(`**${top.title}**`);
    if (top.summary) lines.push(top.summary);
    else lines.push(top.excerpt);
  } else {
    lines.push("Here’s what I found in the knowledge base:");
    for (const hit of hits.slice(0, 3)) {
      lines.push(`• **${hit.title}** — ${hit.excerpt}`);
    }
  }

  const citations = hits.slice(0, 3).map((h) => h.slug);

  const agentHint =
    /\b(agent|human|person|support|operator|representative|call|phone)\b/i.test(userMessage)
      ? "\n\nFor account-specific help, use **Talk to an agent** in this chat."
      : "\n\nNeed a person? Tap **Talk to an agent** anytime.";

  return {
    reply: `${lines.join("\n\n")}${agentHint}`,
    citations,
    source: "knowledge_base",
  };
}

/** Zero-API-cost copilot: keyword search over KnowledgeArticle + rule fallback. */
export async function composeCopilotReply(
  userMessage: string,
  hub: PlatformHub = "all",
): Promise<CopilotReply> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return {
      reply:
        "Ask about tuition payments, school admin, URAPearls Clicker, or URA services. Answers come from our knowledge base — no external AI API.",
      citations: [],
      source: "knowledge_base",
    };
  }

  const hits = await searchKnowledgeBase({ query: trimmed, hub, limit: 4 });
  const kb = formatKbReply(trimmed, hits);
  if (kb) return kb;

  const relaxed = await searchKnowledgeBaseRelaxed({ query: trimmed, hub, limit: 4 });
  const relaxedKb = formatKbReply(trimmed, relaxed);
  if (relaxedKb) return relaxedKb;

  const learned = await autonomousLearnFromGap({ query: trimmed, hub });
  if (learned) return learned;

  return {
    reply: getSupportChatFallbackReply(trimmed),
    citations: [],
    source: "fallback",
  };
}
